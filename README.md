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

    // {
    //   serialNumber: '2960000000',
    //   home: 'My Home',
    //   name: 'My Airthings',
    //   type: 'VIEW_PLUS',
    //   sensors: [
    //     'radonShortTermAvg',
    //     'temp',
    //     'humidity',
    //     'pressure',
    //     'co2',
    //     'voc',
    //     'pm1',
    //     'pm25'
    //   ]
    // }

    const sensorsResponse = await client.getSensors(SensorUnits.Imperial);
    sensorsResponse.results.forEach((sensor) => {
        console.log(sensor);
    });

    // {
    //   serialNumber: '2960000000',
    //   sensors: [
    //     { sensorType: 'radonShortTermAvg', value: 1., unit: 'pci' },
    //     { sensorType: 'humidity', value: 40, unit: 'pct' },
    //     { sensorType: 'temp', value: 68.8, unit: 'f' },
    //     { sensorType: 'co2', value: 678, unit: 'ppm' },
    //     { sensorType: 'voc', value: 234, unit: 'ppb' },
    //     { sensorType: 'pressure', value: 78178, unit: 'pa' },
    //     { sensorType: 'pm25', value: 0, unit: 'mgpc' },
    //     { sensorType: 'pm1', value: 0, unit: 'mgpc' }
    //   ],
    //   recorded: '2025-01-01T12:34:56',
    //   batteryPercentage: 100
    // }
}

main().catch(err => console.error(err));
```
