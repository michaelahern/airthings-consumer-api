import { SensorUnits } from './schemas.js';
import type { Accounts, Devices, SensorResults, SensorResultsRateLimitMetrics } from './schemas.js';

/**
 * The Airthings for Consumer API provides secure and authorized access for Airthings
 * consumers to retrieve the latest data from their Airthings air quality monitors. Leveraging
 * HTTPS and OAuth for enhanced security, this API empowers users to seamlessly access
 * real-time information from their Airthings devices, gaining valuable insights into the air
 * quality within their environments.
 */
export class AirthingsClient {
    #accessToken: AirthingsClientAccessToken | null;
    #opts: AirthingsClientOpts;
    #rateLimitMetrics: SensorResultsRateLimitMetrics;

    /**
     * @param opts - The options for the Airthings client, primarily client credentials
     *
     * @remarks
     * Create an Airthings Client ID & Secret at https://consumer-api-doc.airthings.com/dashboard
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
     * List all accounts the current user is member of
     *
     * @remarks
     * Lists all accounts the current user is member of. The data returned by this endpoint
     * changes when a user is added or removed from business accounts. It is safe to assume
     * that the accountId remains constant for Consumer users. The accountId returned by this
     * endpoint is used to fetch the devices and sensors from the other endpoints.
     *
     * @see [Airthings Consumer API: Accounts](https://consumer-api-doc.airthings.com/api-docs#tag/Accounts)
     *
     * @throws {@link AirthingsError} If the request fails
     */
    public async getAccounts(): Promise<Accounts> {
        const url = 'https://consumer-api.airthings.com/v1/accounts';
        const response = await this.#handleFetch(url);
        return await response.json() as Accounts;
    }

    /**
     * Get all devices connected to a user
     *
     * @remarks
     * List all devices (and their sensor abilities) connected to a user’s account. The data
     * returned by this endpoint changes when a device is registered, unregistered or renamed.
     *
     * @see [Airthings Consumer API: Devices](https://consumer-api-doc.airthings.com/api-docs#tag/Device)
     *
     * @throws {@link AirthingsError} If the request fails
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
     * Get sensors for a set of devices
     *
     * @param unit - The units type sensor values will be returned in, metric or imperial
     * @param sn - An optional list of serial numbers to filter the results
     *
     * @remarks
     * Get sensors for a set of devices. The response will contain the latest sensor values for
     * the devices. The sensor values are updated depending on the device types sampling
     * rate. It is recommended to poll the API at a regular interval to get the latest
     * sensor values. The response will be paginated with a maximum of 50 records per page.
     *
     * @see [Airthings Consumer API: Sensors](https://consumer-api-doc.airthings.com/api-docs#tag/Sensor)
     *
     * @throws {@link AirthingsError} If the request fails
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
     * Get rate limit metrics from the last getSensors request
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
    /**  Override the default Account ID */
    accountId?: string;
    /**  Client ID created via the Airthings Dashboard */
    clientId: string;
    /**  Client Secret created via the Airthings Dashboard */
    clientSecret: string;
}

export class AirthingsError extends Error { }
