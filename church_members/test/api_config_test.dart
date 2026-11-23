import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:church_members/core/config/api_config.dart';

void main() {
  test('Android emulator uses the host machine alias', () {
    expect(
      ApiConfig.resolveBaseUrl(
        configuredUrl: '',
        platform: TargetPlatform.android,
        isWeb: false,
      ),
      'http://10.0.2.2:3000/api',
    );
  });

  test('desktop and web development use localhost', () {
    expect(
      ApiConfig.resolveBaseUrl(
        configuredUrl: '',
        platform: TargetPlatform.windows,
        isWeb: false,
      ),
      'http://localhost:3000/api',
    );
    expect(
      ApiConfig.resolveBaseUrl(
        configuredUrl: '',
        platform: TargetPlatform.android,
        isWeb: true,
      ),
      'http://localhost:3000/api',
    );
  });

  test('API_BASE_URL overrides and normalizes the default', () {
    expect(
      ApiConfig.resolveBaseUrl(
        configuredUrl: ' http://192.168.1.10:3000/api/ ',
        platform: TargetPlatform.android,
        isWeb: false,
      ),
      'http://192.168.1.10:3000/api',
    );
  });
}
