export interface AccessToken {
    token: string;
    type: string;
    expiresAt: number;
}

export interface Account {
    id: string;
}

export interface Accounts {
    accounts: Account[];
}

export interface AirthingsConfiguration {
    id: string;
    secret: string;
}

export interface Device {
    serialNumber: string;
    home: string;
    name: string;
    type: string;
    sensors: string[];
}

export interface Devices {
    devices: Device[];
}
