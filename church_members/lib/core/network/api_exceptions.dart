import 'package:dio/dio.dart';

import '../config/api_config.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException({
    required this.message,
    this.statusCode,
  });

  factory ApiException.fromDio(DioException error) {
    final response = error.response;
    final data = response?.data;

    String message = 'Something went wrong. Please try again.';

    if (data is Map<String, dynamic>) {
      message = data['message']?.toString() ??
          data['error']?.toString() ??
          message;
    } else if (
      error.type == DioExceptionType.connectionTimeout ||
      error.type == DioExceptionType.sendTimeout ||
      error.type == DioExceptionType.receiveTimeout
    ) {
      message =
          'Connection timed out while contacting ${ApiConfig.baseUrl}. Make sure the backend is running.';
    } else if (error.type == DioExceptionType.connectionError) {
      message =
          'Cannot connect to ${ApiConfig.baseUrl}. Make sure the backend is running and reachable from this device.';
    }

    return ApiException(
      message: message,
      statusCode: response?.statusCode,
    );
  }

  @override
  String toString() => message;
}
