import type { AccessToken, Accounts, AirthingsConfiguration, Devices } from './interfaces.js';

export class Airthings {
    private config: AirthingsConfiguration;
    private accessToken: AccessToken | null;

    constructor(configuration: AirthingsConfiguration) {
        this.config = configuration;
        this.accessToken = null;
    }

    public async getAccounts(): Promise<Accounts> {
        if (this.isTokenExpired()) {
            await this.updateToken();
        }

        if (!this.accessToken) {
            throw new Error('No access token');
        }

        try {
            const response = await fetch('https://consumer-api.airthings.com/v1/accounts', {
                headers: {
                    Authorization: `Bearer ${this.accessToken.token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            return await response.json() as Accounts;
        }
        catch (error) {
            throw error;
        }
    }

    public async getDevices(): Promise<Devices> {
        var accounts = await this.getAccounts();
        return await this.getDevicesByAccountId(accounts.accounts[0].id);
    }

    public async getDevicesByAccountId(accountId: string): Promise<Devices> {
        if (this.isTokenExpired()) {
            await this.updateToken();
        }

        if (!this.accessToken) {
            throw new Error('No access token');
        }

        try {
            const response = await fetch(`https://consumer-api.airthings.com/v1/accounts/${accountId}/devices`, {
                headers: {
                    Authorization: `Bearer ${this.accessToken.token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            return await response.json() as Devices;
        }
        catch (error) {
            throw error;
        }
    }

    private isTokenExpired(): boolean {
        if (!this.accessToken) return true;

        return this.accessToken.expiresAt - 15 < Date.now();
    }

    private async updateToken(): Promise<void> {
        const body = JSON.stringify({
            grant_type: 'client_credentials'
        });

        const authorization = Buffer.from(`${this.config.id}:${this.config.secret}`).toString('base64');

        try {
            const response = await fetch(`https://accounts-api.airthings.com/v1/token`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${authorization}`,
                        'Content-Type': 'application/json'
                    },
                    body: body
                }
            )

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const data = await response.json() as {
                access_token: string;
                token_type: string;
                expires_in: number;
            };

            this.accessToken = {
                token: data.access_token,
                type: data.token_type,
                expiresAt: data.expires_in + Date.now()
            };
        }
        catch (error) {
            throw error;
        }
    }
}
