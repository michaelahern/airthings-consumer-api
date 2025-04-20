export interface Account {
    id: string;
}

export interface Accounts {
    accounts: Account[];
}

export interface Device {
    serialNumber: string;
    home?: string;
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
    recorded?: string;
    batteryPercentage?: number;
}

export interface SensorResults {
    results: SensorResult[];
    hasNext: boolean;
    totalPages: number;
}

export interface SensorResultsRateLimits {
    /** Request limit per hour. */
    limit: number;
    /** The number of requests left for the time window. */
    remaining: number;
    /** The timestamp at which the current rate limit window resets. */
    reset: number;
}

export enum SensorUnits {
    Metric,
    Imperial
}
