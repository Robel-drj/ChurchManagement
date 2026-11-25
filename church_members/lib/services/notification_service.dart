import '../core/network/api_client.dart';
import '../models/notification_model.dart';

class NotificationInboxResult {
  final List<NotificationModel> notifications;
  final int unreadCount;
  final int page;
  final int totalPages;

  const NotificationInboxResult({
    required this.notifications,
    required this.unreadCount,
    required this.page,
    required this.totalPages,
  });
}

class NotificationService {
  final ApiClient _apiClient;

  NotificationService(this._apiClient);

  Future<NotificationInboxResult> getInbox({
    required String churchId,
    int page = 1,
    int limit = 20,
    bool unreadOnly = false,
  }) async {
    final response = await _apiClient.get(
      '/churches/$churchId/notifications/inbox',
      queryParameters: {
        'page': page,
        'limit': limit,
        'unread_only': unreadOnly,
      },
    );

    final root = _asMap(response);
    final rawList = root['data'];

    final notifications = rawList is List
        ? rawList
              .whereType<Map>()
              .map(
                (item) =>
                    NotificationModel.fromJson(Map<String, dynamic>.from(item)),
              )
              .toList()
        : <NotificationModel>[];

    final pagination = root['pagination'] is Map
        ? Map<String, dynamic>.from(root['pagination'] as Map)
        : <String, dynamic>{};

    return NotificationInboxResult(
      notifications: notifications,
      unreadCount: _toInt(root['unread_count']),
      page: _toInt(pagination['page'], fallback: page),
      totalPages: _toInt(pagination['totalPages'], fallback: 1),
    );
  }

  Future<void> markRead({
    required String churchId,
    required String notificationId,
  }) async {
    await _apiClient.patch(
      '/churches/$churchId/notifications/$notificationId/read',
      data: <String, dynamic>{},
    );
  }

  Future<int> markAllRead({required String churchId}) async {
    final response = await _apiClient.patch(
      '/churches/$churchId/notifications/read-all',
      data: <String, dynamic>{},
    );

    final root = _asMap(response);
    final data = root['data'];

    if (data is Map) {
      return _toInt(data['updated_count']);
    }

    return 0;
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }

    return <String, dynamic>{};
  }

  int _toInt(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }
}
