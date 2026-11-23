# Church Members mobile app

Flutter application for normal church members.

## Local API setup

Start the backend first:

```powershell
cd ..\backend
npm.cmd start
```

Confirm that `http://localhost:3000/api/health` returns a successful response.

### Android emulator

The app automatically uses `http://10.0.2.2:3000/api`. Android reserves
`10.0.2.2` as the emulator address for the development computer.

```powershell
flutter run -d emulator-5554
```

### Physical Android phone

Connect the phone and computer to the same Wi-Fi network, find the computer's
IPv4 address with `ipconfig`, and run:

```powershell
flutter run --dart-define=API_BASE_URL=http://YOUR_PC_IP:3000/api
```

For example, if the computer address is `192.168.1.10`, use
`http://192.168.1.10:3000/api`. The phone should be able to open
`http://YOUR_PC_IP:3000/api/health` in its browser. Windows Firewall must allow
Node.js on the private network.

When using a USB-connected Android phone, an alternative is:

```powershell
adb reverse tcp:3000 tcp:3000
flutter run --dart-define=API_BASE_URL=http://localhost:3000/api
```

### Flutter web

Port `8080` is already allowed by the backend development CORS configuration:

```powershell
flutter run -d chrome --web-port 8080
```

### Production

Always provide the deployed HTTPS API URL:

```powershell
flutter build apk --dart-define=API_BASE_URL=https://api.example.com/api
```
