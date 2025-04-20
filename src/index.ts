import { SensorUnits } from './interfaces.js';
import type { AccessToken, Accounts, AirthingsConfig, Devices, SensorResults } from './interfaces.js';

export class Airthings {
    private accessToken: AccessToken | null;
    private config: AirthingsConfig;

    constructor(airthingsConfig: AirthingsConfig) {
        this.accessToken = null;
        this.config = airthingsConfig;
    }

    public async getAccounts(): Promise<Accounts> {
        await this.refreshAccessToken();

        if (!this.accessToken) {
            throw new Error('No access token');
        }

        const response = await fetch('https://consumer-api.airthings.com/v1/accounts', {
            headers: {
                Authorization: `${this.accessToken.type} ${this.accessToken.token}`
            }
        });

        await this.checkResponseError(response);

        return await response.json() as Accounts;
    }

    public async getDevices(): Promise<Devices> {
        await this.refreshAccessToken();
        await this.checkAccountId();

        if (!this.accessToken) {
            throw new Error('No access token');
        }

        const response = await fetch(`https://consumer-api.airthings.com/v1/accounts/${this.config.account_id}/devices`, {
            headers: {
                Authorization: `${this.accessToken.type} ${this.accessToken.token}`
            }
        });

        await this.checkResponseError(response);

        return await response.json() as Devices;
    }

    public async getSensors(unit: SensorUnits, sn?: string[]): Promise<SensorResults> {
        await this.refreshAccessToken();
        await this.checkAccountId();

        if (!this.accessToken) {
            throw new Error('No access token');
        }

        let snQueryString = '';
        if (sn && sn.length > 0) {
            snQueryString = `sn=${sn.join(',')}&`;
        }

        console.log(`https://consumer-api.airthings.com/v1/accounts/${this.config.account_id}/sensors?${snQueryString}unit=${SensorUnits[unit].toLowerCase()}`);

        const response = await fetch(`https://consumer-api.airthings.com/v1/accounts/${this.config.account_id}/sensors?${snQueryString}unit=${SensorUnits[unit].toLowerCase()}`, {
            headers: {
                Authorization: `Bearer ${this.accessToken.token}`
            }
        });

        await this.checkResponseError(response);

        return await response.json() as SensorResults;
    }

    private async checkAccountId(): Promise<void> {
        if (!this.config.account_id) {
            const accounts = await this.getAccounts();
            if (accounts.accounts.length > 0) {
                this.config.account_id = accounts.accounts[0].id;
            }
        }
    }

    private async checkResponseError(response: Response): Promise<void> {
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Airthings API Error -> Status Code: ${response.status}, Error: ${errorText}`);
        }
    }

    private async refreshAccessToken(): Promise<void> {
        if (this.accessToken && this.accessToken.expiresAt - 300 > Date.now()) {
            return;
        }

        const authorization = Buffer.from(`${this.config.client_id}:${this.config.client_secret}`).toString('base64');

        const body = JSON.stringify({
            grant_type: 'client_credentials'
        });

        const response = await fetch(`https://accounts-api.airthings.com/v1/token`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authorization}`,
                    'Content-Type': 'application/json'
                },
                body: body
            }
        );

        await this.checkResponseError(response);

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
