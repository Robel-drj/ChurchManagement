import '../core/network/api_client.dart';

class PostService {
  final ApiClient _apiClient;

  PostService(this._apiClient);

  Future<List<Map<String, dynamic>>> getPublishedPosts(String churchId) async {
    final response = await _apiClient.get(
      '/churches/$churchId/content/posts/published',
    );

    return _extractList(response);
  }

  Future<PostLikeState> setPostLiked({
    required String churchId,
    required String postId,
    required bool liked,
  }) async {
    final path = '/churches/$churchId/content/posts/published/$postId/like';
    final response = liked
        ? await _apiClient.put(path)
        : await _apiClient.delete(path);
    dynamic data = response;

    if (data is Map) {
      data = data['data'] ?? data;
    }

    if (data is! Map) {
      throw const FormatException('Invalid post like response.');
    }

    return PostLikeState(
      liked: _asBool(data['liked']),
      likeCount: _asInt(data['like_count'] ?? data['likeCount']),
    );
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

class PostLikeState {
  final bool liked;
  final int likeCount;

  const PostLikeState({required this.liked, required this.likeCount});
}

bool _asBool(Object? value) {
  if (value is bool) return value;
  return value?.toString().toLowerCase() == 'true';
}

int _asInt(Object? value) {
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
