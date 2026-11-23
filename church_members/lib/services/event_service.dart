
import '../core/network/api_client.dart';

class EventService {
  final ApiClient _apiClient;

  EventService(this._apiClient);

  Future<List<Map<String, dynamic>>> getPublishedEvents(
    String churchId,
  ) async {
    final response = await _apiClient.get(
      '/churches/$churchId/events/published',
    );

    return _extractList(response);
  }

  List<Map<String, dynamic>> _extractList(dynamic response) {
    dynamic data = response;

    if (data is Map) {
      data = data['data'] ?? data['events'] ?? data['items'];
    }

    if (data is Map) {
      data = data['events'] ?? data['items'] ?? data['rows'];
    }

    if (data is! List) return [];

    return data
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }
}
