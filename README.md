# Airthings Consumer API

A Node.js client library for the [Airthings Consumer API](https://consumer-api-doc.airthings.com/) .

## Docs

https://michaelahern.github.io/airthings-consumer-api/

## Installing

```bash
$ npm install airthings-consumer-api
```

## Example

```typescript
import { AirthingsClient, SensorUnits } from 'airthings-consumer-api';

async function main() {
    const client = new AirthingsClient({
        clientId: 'clientId',
        clientSecret: 'clientSecret'
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
```
