
import '../core/network/api_client.dart';

class PostService {
  final ApiClient _apiClient;

  PostService(this._apiClient);

  Future<List<Map<String, dynamic>>> getPublishedPosts(
    String churchId,
  ) async {
    final response = await _apiClient.get(
      '/churches/$churchId/content/posts/published',
    );

    return _extractList(response);
  }

  List<Map<String, dynamic>> _extractList(dynamic response) {
    dynamic data = response;

    if (data is Map) {
      data = data['data'] ?? data['posts'] ?? data['items'];
    }

    if (data is Map) {
      data = data['posts'] ?? data['items'] ?? data['rows'];
    }

    if (data is! List) return [];

    return data
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }
}
