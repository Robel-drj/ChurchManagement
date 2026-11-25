class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String notificationType;
  final DateTime? sentAt;
  final bool isRead;
  final DateTime? readAt;

  const NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.notificationType,
    required this.isRead,
    this.sentAt,
    this.readAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Church notification').toString(),
      message: (json['message'] ?? '').toString(),
      notificationType: (json['notification_type'] ?? 'general').toString(),
      sentAt: _parseDate(json['sent_at']),
      isRead: json['is_read'] == true,
      readAt: _parseDate(json['read_at']),
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString())?.toLocal();
  }

  NotificationModel copyWith({bool? isRead, DateTime? readAt}) {
    return NotificationModel(
      id: id,
      title: title,
      message: message,
      notificationType: notificationType,
      sentAt: sentAt,
      isRead: isRead ?? this.isRead,
      readAt: readAt ?? this.readAt,
    );
  }
}
