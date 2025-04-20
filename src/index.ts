import { SensorUnits } from './interfaces.js';
import type { AccessToken, Accounts, AirthingsConfig, Devices, SensorResults } from './interfaces.js';

export class Airthings {
    private accessToken: AccessToken | null;
    private config: AirthingsConfig;

    constructor(configuration: AirthingsConfig) {
        this.accessToken = null;
        this.config = configuration;
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
        const accounts = await this.getAccounts();
        return await this.getDevicesByAccountId(accounts.accounts[0].id);
    }

    public async getDevicesByAccountId(accountId: string): Promise<Devices> {
        await this.refreshAccessToken();

        if (!this.accessToken) {
            throw new Error('No access token');
        }

        const response = await fetch(`https://consumer-api.airthings.com/v1/accounts/${accountId}/devices`, {
            headers: {
                Authorization: `${this.accessToken.type} ${this.accessToken.token}`
            }
        });

        await this.checkResponseError(response);

        return await response.json() as Devices;
    }

    public async getSensors(unit: SensorUnits, sn?: string[]): Promise<SensorResults> {
        await this.refreshAccessToken();

        if (!this.accessToken) {
            throw new Error('No access token');
        }

        const accounts = await this.getAccounts();
        const accountId = accounts.accounts[0].id;

        let snQueryString = '';
        if (sn && sn.length > 0) {
            snQueryString = `sn=${sn.join(',')}&`;
        }

        console.log(`https://consumer-api.airthings.com/v1/accounts/${accountId}/sensors?${snQueryString}unit=${SensorUnits[unit].toLowerCase()}`);

        const response = await fetch(`https://consumer-api.airthings.com/v1/accounts/${accountId}/sensors?${snQueryString}unit=${SensorUnits[unit].toLowerCase()}`, {
            headers: {
                Authorization: `Bearer ${this.accessToken.token}`
            }
        });

        await this.checkResponseError(response);

        return await response.json() as SensorResults;
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

        const authorization = Buffer.from(`${this.config.id}:${this.config.secret}`).toString('base64');

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
