import { SensorUnits } from './interfaces.js';
import type { AccessToken, Accounts, AirthingsConfig, Devices, SensorResults } from './interfaces.js';

export class Airthings {
    private accessToken: AccessToken | null;
    private config: AirthingsConfig;

    constructor(config: AirthingsConfig) {
        this.accessToken = null;
        this.config = config;
    }

    public async getAccounts(): Promise<Accounts> {
        const url = 'https://consumer-api.airthings.com/v1/accounts';
        const response = await this.#handleFetch(url);
        return await response.json() as Accounts;
    }

    public async getDevices(): Promise<Devices> {
        await this.#ensureAccountIdConfig();

        const url = `https://consumer-api.airthings.com/v1/accounts/${this.config.accountId}/devices`;
        const response = await this.#handleFetch(url);
        return await response.json() as Devices;
    }

    public async getSensors(unit: SensorUnits, sn?: string[]): Promise<SensorResults> {
        await this.#ensureAccountIdConfig();

        let url = `https://consumer-api.airthings.com/v1/accounts/${this.config.accountId}/sensors?unit=${SensorUnits[unit].toLowerCase()}`;
        if (sn && sn.length > 0) {
            url += `&sn=${sn.join(',')}`;
        }

        const response = await this.#handleFetch(url);
        return await response.json() as SensorResults;
    }

    async #ensureAccountIdConfig(): Promise<void> {
        if (!this.config.accountId) {
            const accountsResponse = await this.getAccounts();
            if (accountsResponse.accounts.length > 0) {
                this.config.accountId = accountsResponse.accounts[0].id;
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
        if (this.accessToken && this.accessToken.expiresAt + (5 * 60 * 1000) > Date.now()) {
            return;
        }

        const response = await fetch(`https://accounts-api.airthings.com/v1/token`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grant_type: 'client_credentials'
                })
            }
        );

        await this.#handleFetchResponseError(response);

        const data = await response.json() as {
            access_token: string;
            token_type: string;
            expires_in: number;
        };

        this.accessToken = {
            token: data.access_token,
            type: data.token_type,
            expiresAt: data.expires_in * 1000 + Date.now()
        };
    }
}
