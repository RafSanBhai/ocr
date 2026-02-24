import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumina.ocr',
  appName: 'Lumina OCR',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
