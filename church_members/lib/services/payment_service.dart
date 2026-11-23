import '../core/network/api_client.dart';

class PaymentService {
  final ApiClient _apiClient;

  PaymentService(this._apiClient);

  Future<List<Map<String, dynamic>>> getContributionCategories(
    String churchId,
  ) async {
    final response = await _apiClient.get(
      '/churches/$churchId/finance/categories',
    );

    return _extractList(response);
  }

  Future<Map<String, dynamic>> createOnlineContribution({
    required String churchId,
    required String categoryId,
    required double amount,
    required String idempotencyKey,
    String? notes,
  }) async {
    final response = await _apiClient.post(
      '/churches/$churchId/finance/online-contributions',
      data: {
        'category_id': categoryId,
        'amount': amount,
        'idempotency_key': idempotencyKey,
        if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
      },
    );

    return _extractMap(response);
  }

  Future<List<Map<String, dynamic>>> getMyContributions(String churchId) async {
    final response = await _apiClient.get(
      '/churches/$churchId/finance/my-contributions',
    );

    return _extractList(response);
  }

  Future<Map<String, dynamic>> getMyContributionStatus({
    required String churchId,
    required String contributionId,
  }) async {
    final response = await _apiClient.get(
      '/churches/$churchId/finance/online-contributions/$contributionId/status',
    );

    return _extractMap(response);
  }

  List<Map<String, dynamic>> _extractList(dynamic response) {
    dynamic data = response;

    for (var i = 0; i < 4; i++) {
      if (data is Map) {
        final map = Map<String, dynamic>.from(data);

        final list =
            map['items'] ??
            map['methods'] ??
            map['categories'] ??
            map['contributions'] ??
            map['rows'];

        if (list is List) {
          data = list;
          break;
        }

        if (map['data'] != null) {
          data = map['data'];
          continue;
        }
      }

      break;
    }

    if (data is! List) return [];

    return data
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Map<String, dynamic> _extractMap(dynamic response) {
    dynamic data = response;

    for (var i = 0; i < 4; i++) {
      if (data is Map) {
        final map = Map<String, dynamic>.from(data);

        for (final key in ['data', 'contribution', 'payment', 'result']) {
          if (map[key] is Map) {
            data = map[key];
            break;
          }
        }

        if (identical(data, response)) {
          return map;
        }
      } else {
        break;
      }
    }

    return data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
  }
}
