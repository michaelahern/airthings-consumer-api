import { SensorUnits } from './schemas.js';
import type { Accounts, Devices, SensorResults, SensorResultsRateLimits } from './schemas.js';

/**
 * The Airthings for Consumer API provides secure and authorized access for Airthings
 * consumers to retrieve the latest data from their Airthings air quality monitors. Leveraging
 * HTTPS and OAuth for enhanced security, this API empowers users to seamlessly access
 * real-time information from their Airthings devices, gaining valuable insights into the air
 * quality within their environments.
 * @module
 * @disableGroups
 */
export class AirthingsClient {
    private accessToken: AirthingsClientAccessToken | null;
    private opts: AirthingsClientOpts;
    private rateLimits: SensorResultsRateLimits;

    /**
     * @param opts - The options for the Airthings client, primarily client credentials
     */
    constructor(opts: AirthingsClientOpts) {
        this.accessToken = null;
        this.opts = opts;
        this.rateLimits = { limit: -1, remaining: -1, reset: -1 };
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
     * @throws {Error} If the request fails
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
     * @throws {Error} If the request fails
     */
    public async getDevices(): Promise<Devices> {
        await this.#ensureAccountIdConfig();

        const url = `https://consumer-api.airthings.com/v1/accounts/${this.opts.accountId}/devices`;
        const response = await this.#handleFetch(url);
        return await response.json() as Devices;
    }

    /**
     * Get sensors for a set of devices
     *
     * @remarks
     * Get sensors for a set of devices. The response will contain the latest sensor values for
     * the devices. The sensor values are updated depending on the device types sampling
     * rate. It is recommended to poll the API at a regular interval to get the latest
     * sensor values. The response will be paginated with a maximum of 50 records per page.
     *
     * @see [Airthings Consumer API: Sensors](https://consumer-api-doc.airthings.com/api-docs#tag/Sensor)
     *
     * @param unit - The units type sensor values will be returned in, metric or imperial
     * @param sn - An optional list of serial numbers to filter the results
     * @throws {Error} If the request fails
     */
    public async getSensors(unit: SensorUnits, sn?: string[]): Promise<SensorResults> {
        await this.#ensureAccountIdConfig();

        let url = `https://consumer-api.airthings.com/v1/accounts/${this.opts.accountId}/sensors?unit=${SensorUnits[unit].toLowerCase()}`;
        if (sn && sn.length > 0) {
            url += `&sn=${sn.join(',')}`;
        }

        const response = await this.#handleFetch(url);

        this.rateLimits.limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0');
        this.rateLimits.remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
        this.rateLimits.reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0');

        return await response.json() as SensorResults;
    }

    /**
     * Get rate limiting details from the last getSensors request
     *
     * @see [Airthings Consumer API: Rate Limits](https://consumer-api-doc.airthings.com/api-docs#section/Rate-Limits)
     */
    public getRateLimits(): SensorResultsRateLimits {
        return this.rateLimits;
    }

    async #ensureAccountIdConfig(): Promise<void> {
        if (!this.opts.accountId) {
            const accountsResponse = await this.getAccounts();
            if (accountsResponse.accounts.length > 0) {
                this.opts.accountId = accountsResponse.accounts[0].id;
            }
            else {
                throw new Error('Airthings: No Account ID');
            }
        }
    }

    async #handleFetch(url: string): Promise<Response> {
        await this.#refreshAccessToken();

        if (!this.accessToken) {
            throw new Error('Airthings: No Access Token');
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `${this.accessToken.type} ${this.accessToken.token}`
            }
        });

        await this.#handleFetchResponseError(response);

        return response;
    }

    async #handleFetchResponseError(response: Response): Promise<void> {
        if (!response.ok) {
            throw new Error(`Airthings: Request Error [${response.status}: ${await response.text()}]`);
        }
    }

    async #refreshAccessToken(): Promise<void> {
        if (this.accessToken && this.accessToken.expires + (5 * 60 * 1000) > Date.now()) {
            return;
        }

        const response = await fetch(`https://accounts-api.airthings.com/v1/token`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${this.opts.clientId}:${this.opts.clientSecret}`).toString('base64')}`,
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

        this.accessToken = {
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
