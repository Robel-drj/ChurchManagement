import 'package:dio/dio.dart';

import '../storage/token_storage.dart';

class AuthInterceptor extends Interceptor {
  static const String _retriedRequestKey = 'auth_request_retried';

  final TokenStore tokenStorage;
  final Dio retryClient;
  final Dio refreshClient;

  Future<String?>? _refreshingToken;

  AuthInterceptor({
    required this.tokenStorage,
    required this.retryClient,
    required this.refreshClient,
  });

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await tokenStorage.getAccessToken();

    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final request = err.requestOptions;

    if (err.response?.statusCode != 401 ||
        request.extra[_retriedRequestKey] == true ||
        _isAuthenticationRequest(request.path)) {
      handler.next(err);
      return;
    }

    try {
      final storedAccessToken = await tokenStorage.getAccessToken();
      final requestAccessToken = request.headers['Authorization']?.toString();

      // Another failed request may have already refreshed the token. Reuse it
      // rather than rotating the refresh token a second time.
      final accessToken =
          storedAccessToken != null &&
              requestAccessToken != 'Bearer $storedAccessToken'
          ? storedAccessToken
          : await _refreshAccessToken();

      if (accessToken == null || accessToken.isEmpty) {
        await tokenStorage.clearTokens();
        handler.next(err);
        return;
      }

      request.headers['Authorization'] = 'Bearer $accessToken';
      request.extra[_retriedRequestKey] = true;

      final response = await retryClient.fetch<dynamic>(request);
      handler.resolve(response);
    } on DioException catch (refreshError) {
      final statusCode = refreshError.response?.statusCode;

      if (statusCode == 400 || statusCode == 401 || statusCode == 403) {
        await tokenStorage.clearTokens();
      }

      handler.next(refreshError);
    } catch (_) {
      await tokenStorage.clearTokens();
      handler.next(err);
    }
  }

  bool _isAuthenticationRequest(String path) {
    return path.endsWith('/auth/login') ||
        path.endsWith('/auth/register') ||
        path.endsWith('/auth/refresh');
  }

  Future<String?> _refreshAccessToken() {
    final activeRefresh = _refreshingToken;

    if (activeRefresh != null) {
      return activeRefresh;
    }

    late final Future<String?> refresh;
    refresh = _performTokenRefresh().whenComplete(() {
      if (identical(_refreshingToken, refresh)) {
        _refreshingToken = null;
      }
    });

    _refreshingToken = refresh;
    return refresh;
  }

  Future<String?> _performTokenRefresh() async {
    final refreshToken = await tokenStorage.getRefreshToken();

    if (refreshToken == null || refreshToken.isEmpty) {
      return null;
    }

    final response = await refreshClient.post<dynamic>(
      '/auth/refresh',
      data: {'refreshToken': refreshToken},
    );

    final responseBody = response.data;

    if (responseBody is! Map<String, dynamic>) {
      return null;
    }

    final data = responseBody['data'];

    if (data is! Map<String, dynamic>) {
      return null;
    }

    final accessToken = data['accessToken']?.toString();
    final newRefreshToken = data['refreshToken']?.toString();

    if (accessToken == null ||
        accessToken.isEmpty ||
        newRefreshToken == null ||
        newRefreshToken.isEmpty) {
      return null;
    }

    await tokenStorage.saveTokens(
      accessToken: accessToken,
      refreshToken: newRefreshToken,
    );

    return accessToken;
  }
}
