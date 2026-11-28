import 'package:flutter/foundation.dart';

class ApiConfig {
  ApiConfig._();

  static const String _configuredBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
  );

  /// Uses the Android emulator's host alias by default. A physical phone must
  /// provide the development computer's LAN address with API_BASE_URL.
  /// Example:
  /// flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000/api
  static String get baseUrl => resolveBaseUrl(
        configuredUrl: _configuredBaseUrl,
        platform: defaultTargetPlatform,
        isWeb: kIsWeb,
      );

  @visibleForTesting
  static String resolveBaseUrl({
    required String configuredUrl,
    required TargetPlatform platform,
    required bool isWeb,
  }) {
    final override = configuredUrl.trim();

    if (override.isNotEmpty) {
      return override.endsWith('/')
          ? override.substring(0, override.length - 1)
          : override;
    }

    if (!isWeb && platform == TargetPlatform.android) {
      return 'http://192.168.1.5:3000/api';
    }

    return 'http://localhost:3000/api';
  }

    static const Duration connectionTimeout = Duration(seconds: 30);

  static const Duration receiveTimeout = Duration(seconds: 30);
}
