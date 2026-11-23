import 'dart:async';

import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../core/storage/token_storage.dart';
import '../models/user_model.dart';

class AuthService {
  final ApiClient apiClient;
  final TokenStore tokenStorage;

  AuthService({required this.apiClient, required this.tokenStorage});

  Future<UserModel> login({
    required String identifier,
    required String password,
  }) async {
    final response = await apiClient.post(
      '/auth/login',
      data: {'identifier': identifier, 'password': password},
    );

    final data = _responseData(response, 'login');

    final accessToken = data['accessToken']?.toString();
    final refreshToken = data['refreshToken']?.toString();
    final userData = data['user'];

    if (accessToken == null ||
        accessToken.isEmpty ||
        refreshToken == null ||
        refreshToken.isEmpty ||
        userData is! Map<String, dynamic>) {
      throw ApiException(
        message: 'The server returned incomplete login information.',
      );
    }

    final user = UserModel.fromJson(userData);

    await tokenStorage.saveTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );

    return user;
  }

  Future<UserModel> getCurrentUser() async {
    final response = await apiClient.get('/auth/me');
    final data = _responseData(response, 'account');
    final userData = data['user'];

    if (userData is! Map<String, dynamic>) {
      throw ApiException(
        message: 'The server returned incomplete account information.',
      );
    }

    return UserModel.fromJson(userData);
  }

  Future<UserModel?> restoreSession() async {
    if (!await tokenStorage.hasAccessToken()) {
      return null;
    }

    try {
      return await getCurrentUser();
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        await tokenStorage.clearTokens();
        return null;
      }

      rethrow;
    }
  }

  Future<void> logout() async {
    final refreshToken = await tokenStorage.getRefreshToken();
    await tokenStorage.clearTokens();

    if (refreshToken != null && refreshToken.isNotEmpty) {
      unawaited(_revokeSession(refreshToken));
    }
  }

  Future<bool> isLoggedIn() async {
    return tokenStorage.hasAccessToken();
  }

  Future<void> _revokeSession(String refreshToken) async {
    try {
      await apiClient.post(
        '/auth/logout',
        data: {'refreshToken': refreshToken},
      );
    } catch (_) {
      // Local logout must still succeed when the backend is unavailable.
    }
  }

  Map<String, dynamic> _responseData(dynamic response, String operation) {
    if (response is! Map<String, dynamic>) {
      throw ApiException(
        message: 'The server returned an invalid $operation response.',
      );
    }

    final data = response['data'] ?? response;

    if (data is! Map<String, dynamic>) {
      throw ApiException(
        message: 'The server returned invalid $operation data.',
      );
    }

    return data;
  }
}
