import { SensorUnits } from './schemas.js';
import type { Accounts, Devices, SensorResults, SensorResultsRateLimitMetrics } from './schemas.js';

/**
 * La API de Airthings para Consumidores proporciona acceso seguro y autorizado para que los
 * consumidores de Airthings recuperen los datos más recientes de sus monitores de calidad del aire
 * Airthings. Aprovechando HTTPS y OAuth para mayor seguridad, esta API permite a los usuarios
 * acceder sin problemas a información en tiempo real de sus dispositivos Airthings, obteniendo
 * información valiosa sobre la calidad del aire en sus entornos.
 */
export class AirthingsClient {
    #accessToken: AirthingsClientAccessToken | null;
    #opts: AirthingsClientOpts;
    #rateLimitMetrics: SensorResultsRateLimitMetrics;

    /**
     * @param opts - Las opciones para el cliente de Airthings, principalmente credenciales del cliente
     *
     * @remarks
     * Crea un ID de Cliente y Secreto de Airthings en https://consumer-api-doc.airthings.com/dashboard
     *
     * @example
     * ```javascript
     * const client = new AirthingsClient({
     *     clientId: 'clientId',
     *     clientSecret: 'clientSecret'
     * });
     * ```
     */
    constructor(opts: AirthingsClientOpts) {
        this.#accessToken = null;
        this.#opts = opts;
        this.#rateLimitMetrics = { limit: -1, remaining: -1, reset: -1 };
    }

    /**
     * Lista todas las cuentas de las que el usuario actual es miembro
     *
     * @remarks
     * Lista todas las cuentas de las que el usuario actual es miembro. Los datos devueltos por este
     * endpoint cambian cuando un usuario es agregado o removido de las cuentas empresariales. Es
     * seguro asumir que el accountId permanece constante para usuarios Consumidores. El accountId
     * devuelto por este endpoint se usa para obtener los dispositivos y sensores de los otros endpoints.
     *
     * @see [Airthings Consumer API: Accounts](https://consumer-api-doc.airthings.com/api-docs#tag/Accounts)
     *
     * @throws {@link AirthingsError} Si la solicitud falla
     */
    public async getAccounts(): Promise<Accounts> {
        const url = 'https://consumer-api.airthings.com/v1/accounts';
        const response = await this.#handleFetch(url);
        return await response.json() as Accounts;
    }

    /**
     * Obtiene todos los dispositivos conectados a un usuario
     *
     * @remarks
     * Lista todos los dispositivos (y sus capacidades de sensores) conectados a la cuenta de un usuario. Los datos
     * devueltos por este endpoint cambian cuando un dispositivo es registrado, desregistrado o renombrado.
     *
     * @see [Airthings Consumer API: Devices](https://consumer-api-doc.airthings.com/api-docs#tag/Device)
     *
     * @throws {@link AirthingsError} Si la solicitud falla
     *
     * @example
     * ```javascript
     * const devicesResponse = await client.getDevices();
     * devicesResponse.devices.forEach((device) => {
     *   console.log(device);
     * });
     * ```
     */
    public async getDevices(): Promise<Devices> {
        await this.#ensureAccountIdConfig();

        const url = `https://consumer-api.airthings.com/v1/accounts/${this.#opts.accountId}/devices`;
        const response = await this.#handleFetch(url);
        return await response.json() as Devices;
    }

    /**
     * Obtiene sensores para un conjunto de dispositivos
     *
     * @param unit - El tipo de unidades en que se devolverán los valores de los sensores, métrico o imperial
     * @param sn - Una lista opcional de números de serie para filtrar los resultados
     *
     * @remarks
     * Obtiene sensores para un conjunto de dispositivos. La respuesta contendrá los valores de sensores más
     * recientes para los dispositivos. Los valores de los sensores se actualizan dependiendo de la tasa de
     * muestreo del tipo de dispositivo. Se recomienda sondear la API a intervalos regulares para obtener
     * los valores más recientes de los sensores. La respuesta estará paginada con un máximo de 50 registros por página.
     *
     * @see [Airthings Consumer API: Sensors](https://consumer-api-doc.airthings.com/api-docs#tag/Sensor)
     *
     * @throws {@link AirthingsError} Si la solicitud falla
     *
     * @example
     * ```javascript
     * const sensorsResponse = await client.getSensors(SensorUnits.Imperial);
     * sensorsResponse.results.forEach((sensor) => {
     *   console.log(sensor);
     * });
     * ```
     */
    public async getSensors(unit: SensorUnits, sn?: string[]): Promise<SensorResults> {
        await this.#ensureAccountIdConfig();

        let url = `https://consumer-api.airthings.com/v1/accounts/${this.#opts.accountId}/sensors?unit=${SensorUnits[unit].toLowerCase()}`;
        if (sn && sn.length > 0) {
            url += `&sn=${sn.join(',')}`;
        }

        const response = await this.#handleFetch(url);

        this.#rateLimitMetrics.limit = parseInt(response.headers.get('X-RateLimit-Limit') || '-1');
        this.#rateLimitMetrics.remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '-1');
        this.#rateLimitMetrics.reset = parseInt(response.headers.get('X-RateLimit-Reset') || '-1');

        return await response.json() as SensorResults;
    }

    /**
     * Obtiene las métricas de límite de velocidad de la última solicitud getSensors
     *
     * @see [Airthings Consumer API: Rate Limits](https://consumer-api-doc.airthings.com/docs/api/rate-limit)
     */
    public getSensorsRateLimitMetrics(): SensorResultsRateLimitMetrics {
        return this.#rateLimitMetrics;
    }

    async #ensureAccountIdConfig(): Promise<void> {
        if (!this.#opts.accountId) {
            const accountsResponse = await this.getAccounts();
            if (accountsResponse.accounts.length > 0) {
                this.#opts.accountId = accountsResponse.accounts[0].id;
            }
            else {
                throw new AirthingsError('No Account ID');
            }
        }
    }

    async #handleFetch(url: string): Promise<Response> {
        await this.#refreshAccessToken();

        if (!this.#accessToken) {
            throw new AirthingsError('No Access Token');
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `${this.#accessToken.type} ${this.#accessToken.token}`
            }
        });

        await this.#handleFetchResponseError(response);

        return response;
    }

    async #handleFetchResponseError(response: Response): Promise<void> {
        if (!response.ok) {
            throw new AirthingsError(`Request Error [${response.status}: ${await response.text()}]`);
        }
    }

    async #refreshAccessToken(): Promise<void> {
        if (this.#accessToken && this.#accessToken.expires - (5 * 60 * 1000) > Date.now()) {
            return;
        }

        const response = await fetch(`https://accounts-api.airthings.com/v1/token`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${this.#opts.clientId}:${this.#opts.clientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grant_type: 'client_credentials'
                })
            }
        );

        await this.#handleFetchResponseError(response);

        const tokenData = await response.json() as {
            access_token: string;
            token_type: string;
            expires_in: number;
        };

        this.#accessToken = {
            token: tokenData.access_token,
            type: tokenData.token_type,
            expires: tokenData.expires_in * 1000 + Date.now()
        };
    }
}

interface AirthingsClientAccessToken {
    token: string;
    type: string;
    expires: number;
}

export interface AirthingsClientOpts {
    /** Sobrescribir el ID de Cuenta predeterminado */
    accountId?: string;
    /** ID de Cliente creado mediante el Panel de Airthings */
    clientId: string;
    /** Secreto de Cliente creado mediante el Panel de Airthings */
    clientSecret: string;
}

export class AirthingsError extends Error { }
