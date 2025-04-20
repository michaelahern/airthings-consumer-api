#!/usr/bin/env node
import { Airthings } from './index.js';
import { SensorUnits } from './interfaces.js';

async function main() {
    const clientId = process.env.AIRTHINGS_CLIENT_ID;
    const clientSecret = process.env.AIRTHINGS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('Please set the AIRTHINGS_CLIENT_ID and AIRTHINGS_CLIENT_SECRET environment variables.');
        process.exit(1);
    }

    const client = new Airthings({
        clientId: clientId,
        clientSecret: clientSecret
    });

    const devicesResponse = await client.getDevices();
    devicesResponse.devices.forEach((device) => {
        console.log(device);
    });

    const sensorsResponse = await client.getSensors(SensorUnits.Imperial);
    sensorsResponse.results.forEach((sensor) => {
        console.log(sensor);
    });
}

main().catch(err => console.error(err));
