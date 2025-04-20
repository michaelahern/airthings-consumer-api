import { Airthings } from './index.js';
import { SensorUnits } from './interfaces.js';

async function main() {
    const client = new Airthings({
        client_id: process.env.AIRTHINGS_CLIENT_ID ?? '',
        client_secret: process.env.AIRTHINGS_CLIENT_SECRET ?? ''
    });

    const accounts = await client.getAccounts();
    console.log(accounts);
    console.log(accounts.accounts[0].id);

    const devices = await client.getDevices();
    console.log(devices);
    console.log(devices.devices[0].sensors);

    const sensors = await client.getSensors(SensorUnits.Metric);
    console.log(sensors);
    console.log(sensors.results[1]);
    console.log(sensors.results[1].sensors);
}

main().catch(err => console.error(err));
