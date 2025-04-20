/** @ignore */
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

export interface AirthingsConfig {
    account_id?: string;
    client_id: string;
    client_secret: string;
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

export interface Sensor {
    sensorType: string;
    value: number;
    unit: string;
}

export interface SensorResult {
    serialNumber: string;
    sensors: Sensor[];
    recorded: string;
    batteryPercentage: number;
}

export interface SensorResults {
    results: SensorResult[];
    hasNext: boolean;
    totalPages: number;
}

export enum SensorUnits {
    Metric,
    Imperial
}
