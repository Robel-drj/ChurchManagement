import 'package:flutter/material.dart';

import '../../services/notification_service.dart';
import 'member_notifications_page.dart';

class NotificationBellButton extends StatefulWidget {
  final String churchId;
  final NotificationService notificationService;

  const NotificationBellButton({
    super.key,
    required this.churchId,
    required this.notificationService,
  });

  @override
  State<NotificationBellButton> createState() => _NotificationBellButtonState();
}

class _NotificationBellButtonState extends State<NotificationBellButton> {
  int _unreadCount = 0;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadUnreadCount();
  }

  Future<void> _loadUnreadCount() async {
    if (_loading) return;

    setState(() => _loading = true);

    try {
      final result = await widget.notificationService.getInbox(
        churchId: widget.churchId,
        page: 1,
        limit: 1,
      );

      if (!mounted) return;

      setState(() {
        _unreadCount = result.unreadCount;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _openInbox() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MemberNotificationsPage(
          churchId: widget.churchId,
          notificationService: widget.notificationService,
        ),
      ),
    );

    if (mounted) {
      await _loadUnreadCount();
    }
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Notifications',
      onPressed: _openInbox,
      icon: Badge(
        isLabelVisible: _unreadCount > 0,
        label: Text(_unreadCount > 99 ? '99+' : _unreadCount.toString()),
        child: const Icon(Icons.notifications_outlined),
      ),
    );
  }
}
