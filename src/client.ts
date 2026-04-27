import { SensorUnits } from './schemas.js';
import type { Accounts, Devices, RemoteControlState, SensorResults, SensorResultsRateLimitMetrics } from './schemas.js';

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
     * @remarks
     * Create an Airthings Client ID & Secret at https://consumer-api-doc.airthings.com/dashboard
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
     * @returns
     * Lists all accounts the current user is member of. The data returned by this endpoint
     * changes when a user is added or removed from business accounts. It is safe to assume
     * that the accountId remains constant for Consumer users. The accountId returned by this
     * endpoint is used to fetch the devices and sensors from the other endpoints.
     * @see [Airthings Consumer API: Accounts](https://consumer-api-doc.airthings.com/api-docs#tag/Accounts)
     * @throws {@link AirthingsError} If the request fails
     */
    public async getAccounts(): Promise<Accounts> {
        const url = 'https://consumer-api.airthings.com/v1/accounts';
        const response = await this.#handleFetch(url);
        return await response.json() as Accounts;
    }

    /**
     * Get all devices connected to a user
     * @returns
     * List all devices (and their sensor abilities) connected to a user’s account. The data
     * returned by this endpoint changes when a device is registered, unregistered or renamed.
     * @see [Airthings Consumer API: Devices](https://consumer-api-doc.airthings.com/api-docs#tag/Device)
     * @throws {@link AirthingsError} If the request fails
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
     * @param unit - The units type sensor values will be returned in, metric or imperial
     * @param sn - An optional list of serial numbers to filter the results
     * @returns
     * Get sensors for a set of devices. The response will contain the latest sensor values for
     * the devices. The sensor values are updated depending on the device types sampling
     * rate. It is recommended to poll the API at a regular interval to get the latest
     * sensor values. The response will be paginated with a maximum of 50 records per page.
     * @see [Airthings Consumer API: Sensors](https://consumer-api-doc.airthings.com/api-docs#tag/Sensor)
     * @throws {@link AirthingsError} If the request fails
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
     * Get the remote control state of a Renew device
     * @param sn - The serial number of the device
     * @returns
     * The last reported operational mode of a Renew (AP\_1) air purifier.
     * The state reflects what the device last reported, not necessarily the
     * command last sent. If the device has never synced a mode, a 404 error
     * is returned.
     * @see [Airthings Consumer API: Remote Control](https://consumer-api-doc.airthings.com/api-docs#tag/Remote-Control)
     * @throws {@link AirthingsError} If the request fails
     * @example
     * ```javascript
     * const state = await client.getRemoteControl('4100007329');
     * console.log(state.mode);
     * ```
     */
    public async getRemoteControl(sn: string): Promise<RemoteControlState> {
        await this.#ensureAccountIdConfig();

        const url = `https://consumer-api.airthings.com/v1/accounts/${this.#opts.accountId}/devices/${sn}/remote-control`;
        const response = await this.#handleFetch(url);
        return await response.json() as RemoteControlState;
    }

    /**
     * Set the remote control mode of a Renew device
     * @param sn - The serial number of the device
     * @param state - The desired operational mode and optional fan speed
     * @returns
     * Set the operational mode of a Renew (AP\_1) air purifier. Available modes
     * are OFF, AUTO, SLEEP, BOOST, and MANUAL. Fan speed (1-5) is required for
     * MANUAL mode. The command is forwarded to the device asynchronously. Use
     * {@link getRemoteControl} to confirm the device has applied the new mode.
     * @see [Airthings Consumer API: Remote Control](https://consumer-api-doc.airthings.com/api-docs#tag/Remote-Control)
     * @throws {@link AirthingsError} If the request fails
     * @example
     * ```javascript
     * import { RemoteControlMode } from 'airthings-consumer-api';
     *
     * await client.setRemoteControl('4100007329', {
     *     mode: RemoteControlMode.Manual,
     *     fanSpeed: 3
     * });
     * ```
     */
    public async setRemoteControl(sn: string, state: RemoteControlState): Promise<void> {
        await this.#ensureAccountIdConfig();

        const url = `https://consumer-api.airthings.com/v1/accounts/${this.#opts.accountId}/devices/${sn}/remote-control`;
        await this.#handleFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
    }

    /**
     * Get rate limit metrics from the last getSensors request
     * @returns
     * Current rate limit metrics reflecting the `X-RateLimit-Limit`,
     * `X-RateLimit-Remaining`, and `X-RateLimit-Reset` response headers from
     * the most recent {@link getSensors} call. Before any {@link getSensors}
     * call has been made, all rate limit metrics are initialised to `-1`.
     * @see [Airthings Consumer API: Rate Limits](https://consumer-api-doc.airthings.com/docs/api/rate-limit)
     */
    public getSensorsRateLimitMetrics(): SensorResultsRateLimitMetrics {
        return this.#rateLimitMetrics;
    }

    async #ensureAccountIdConfig(): Promise<void> {
        if (!this.#opts.accountId) {
            const accountsResponse = await this.getAccounts();
            if (accountsResponse.accounts[0]) {
                this.#opts.accountId = accountsResponse.accounts[0].id;
            }
            else {
                throw new AirthingsError('No Account ID');
            }
        }
    }

    async #handleFetch(url: string, init?: RequestInit): Promise<Response> {
        await this.#refreshAccessToken();

        if (!this.#accessToken) {
            throw new AirthingsError('No Access Token');
        }

        const headers = new Headers(init?.headers);
        headers.set('Authorization', `${this.#accessToken.type} ${this.#accessToken.token}`);

        const response = await fetch(url, { ...init, headers });

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
