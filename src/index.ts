import { SensorUnits } from './interfaces.js';
import type { AccessToken, Accounts, AirthingsClientOpts, Devices, SensorResults } from './interfaces.js';

export class AirthingsClient {
    private accessToken: AccessToken | null;
    private opts: AirthingsClientOpts;

    constructor(opts: AirthingsClientOpts) {
        this.accessToken = null;
        this.opts = opts;
    }

    public async getAccounts(): Promise<Accounts> {
        const url = 'https://consumer-api.airthings.com/v1/accounts';
        const response = await this.#handleFetch(url);
        return await response.json() as Accounts;
    }

    /**
     * List all devices (and their sensor abilities) connected to a user’s account. The data
     * returned by this endpoint changes when a device is registered, unregistered or renamed.
     *
     * https://consumer-api-doc.airthings.com/api-docs#tag/Device
     *
     * @returns A list of devices for the account. The response will contain a list of devices
     */
    public async getDevices(): Promise<Devices> {
        await this.#ensureAccountIdConfig();

        const url = `https://consumer-api.airthings.com/v1/accounts/${this.opts.accountId}/devices`;
        const response = await this.#handleFetch(url);
        return await response.json() as Devices;
    }

    /**
     * Get sensors for a set of devices. The response will contain the latest sensor values for
     * the devices. The sensor values are updated depending on the device types sampling
     * rate. It is recommended to poll the API at a regular interval to get the latest
     * sensor values. The response will be paginated with a maximum of 50 records per page.
     *
     * https://consumer-api-doc.airthings.com/api-docs#tag/Sensor
     *
     * unit - The units type sensors values will be returned in
     * sn - An optional list of serial numbers to filter the results
     */
    public async getSensors(unit: SensorUnits, sn?: string[]): Promise<SensorResults> {
        await this.#ensureAccountIdConfig();

        let url = `https://consumer-api.airthings.com/v1/accounts/${this.opts.accountId}/sensors?unit=${SensorUnits[unit].toLowerCase()}`;
        if (sn && sn.length > 0) {
            url += `&sn=${sn.join(',')}`;
        }

        const response = await this.#handleFetch(url);
        return await response.json() as SensorResults;
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
