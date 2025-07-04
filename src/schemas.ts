export interface Account {
    id: string;
}

export interface Accounts {
    accounts: Account[];
}

/**
 * @example
 * ```json
 * {
 *   serialNumber: '2960000000',
 *   home: 'My Home',
 *   name: 'My Airthings',
 *   type: 'VIEW_PLUS',
 *   sensors: [
 *     'temp',
 *     'humidity',
 *     ...
 *   ]
 * }
 */
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

/**
 * @example
 * ```json
 * { sensorType: 'temp', value: 68.1, unit: 'f' }
 * ```
 */
export interface Sensor {
    sensorType: string;
    value: number;
    unit: string;
}

/**
 * @example
 * ```json
 * {
 *   serialNumber: '2960000000',
 *   sensors: [
 *     { sensorType: 'temp', value: 68.1, unit: 'f' },
 *     { sensorType: 'humidity', value: 40, unit: 'pct' },
 *     ...
 *   ],
 *   recorded: '2025-01-01T00:00:00',
 *   batteryPercentage: 100
 * }
 * ```
 */
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

export interface SensorResultsRateLimitMetrics {
    /** X-RateLimit-Limit: Límite de solicitudes por hora. */
    limit: number;
    /** X-RateLimit-Remaining: El número de solicitudes restantes para la ventana de tiempo. */
    remaining: number;
    /** X-RateLimit-Reset: La marca de tiempo en la que se reinicia la ventana actual de límite de velocidad. */
    reset: number;
}

export enum SensorUnits {
    Metric,
    Imperial
}
