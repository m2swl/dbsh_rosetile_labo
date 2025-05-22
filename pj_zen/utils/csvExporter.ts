
import { DiaryRecord, SensorDataPoint } from '../types';

const convertToCSV = (data: SensorDataPoint[]): string => {
  if (!data || data.length === 0) return "";

  const headers = ['timestamp', 'gyroX', 'gyroY', 'gyroZ', 'accelX', 'accelY', 'accelZ', 'micLevel'];
  const rows = data.map(point => [
    point.timestamp,
    point.gyro?.x ?? '',
    point.gyro?.y ?? '',
    point.gyro?.z ?? '',
    point.accel?.x ?? '',
    point.accel?.y ?? '',
    point.accel?.z ?? '',
    point.mic ?? ''
  ].join(','));

  return [headers.join(','), ...rows].join('\\n');
};

export const exportSensorDataToCSV = (records: DiaryRecord[], recordId?: string): void => {
  let dataToExport: SensorDataPoint[] = [];
  let fileName = "all_sensor_data.csv";

  if (recordId) {
    const record = records.find(r => r.id === recordId);
    if (record && record.sensorData.length > 0) {
      dataToExport = record.sensorData;
      fileName = `sensor_data_${record.title.replace(/\s+/g, '_') || record.id}.csv`;
    } else {
      alert("No sensor data found for this record or record not found.");
      return;
    }
  } else {
    records.forEach(record => {
      dataToExport.push(...record.sensorData);
    });
    if(dataToExport.length === 0) {
        alert("No sensor data found in any records.");
        return;
    }
  }


  const csvString = convertToCSV(dataToExport);
  if (!csvString) {
    alert("No data to export.");
    return;
  }

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) { // feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    alert("CSV export is not supported in this browser.");
  }
};
