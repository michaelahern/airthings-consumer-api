#!/usr/bin/env node
import { AirthingsClient, SensorUnits } from './module.js';

async function main() {
    const clientId = process.env.AIRTHINGS_CLIENT_ID;
    const clientSecret = process.env.AIRTHINGS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('Please set the AIRTHINGS_CLIENT_ID and AIRTHINGS_CLIENT_SECRET environment variables.');
        process.exit(1);
    }

    const client = new AirthingsClient({
        clientId: clientId,
        clientSecret: clientSecret
    });

    const devicesResponse = await client.getDevices();
    devicesResponse.devices.forEach((device) => {
        console.log(device);
    });

    const sensorsResponse = await client.getSensors(SensorUnits.Metric);
    sensorsResponse.results.forEach((sensor) => {
        console.log(sensor);
    });

    console.log(client.getSensorsRateLimitMetrics());
}

main().catch(err => console.error(err));
