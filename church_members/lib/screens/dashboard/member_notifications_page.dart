import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/notification_model.dart';
import '../../services/notification_service.dart';

class MemberNotificationsPage extends StatefulWidget {
  final String churchId;
  final NotificationService notificationService;

  const MemberNotificationsPage({
    super.key,
    required this.churchId,
    required this.notificationService,
  });

  @override
  State<MemberNotificationsPage> createState() =>
      _MemberNotificationsPageState();
}

class _MemberNotificationsPageState extends State<MemberNotificationsPage> {
  final ScrollController _scrollController = ScrollController();

  List<NotificationModel> _notifications = [];

  int _unreadCount = 0;
  int _page = 1;
  int _totalPages = 1;

  bool _loading = true;
  bool _loadingMore = false;
  bool _markingAll = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadInbox();
    _scrollController.addListener(_handleScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_handleScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _handleScroll() {
    if (!_scrollController.hasClients ||
        _loadingMore ||
        _loading ||
        _page >= _totalPages) {
      return;
    }

    final position = _scrollController.position;

    if (position.pixels >= position.maxScrollExtent - 250) {
      _loadMore();
    }
  }

  Future<void> _loadInbox({bool refresh = false}) async {
    if (refresh) {
      _page = 1;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await widget.notificationService.getInbox(
        churchId: widget.churchId,
        page: 1,
        limit: 20,
      );

      if (!mounted) return;

      setState(() {
        _notifications = result.notifications;
        _unreadCount = result.unreadCount;
        _page = result.page;
        _totalPages = result.totalPages;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _page >= _totalPages) return;

    setState(() => _loadingMore = true);

    try {
      final nextPage = _page + 1;

      final result = await widget.notificationService.getInbox(
        churchId: widget.churchId,
        page: nextPage,
        limit: 20,
      );

      if (!mounted) return;

      setState(() {
        _notifications.addAll(result.notifications);
        _unreadCount = result.unreadCount;
        _page = result.page;
        _totalPages = result.totalPages;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() => _loadingMore = false);
      _showMessage('Could not load more notifications.');
    }
  }

  Future<void> _markOneRead(NotificationModel notification) async {
    if (notification.isRead) return;

    final index = _notifications.indexWhere(
      (item) => item.id == notification.id,
    );

    if (index == -1) return;

    final previous = _notifications[index];

    setState(() {
      _notifications[index] = previous.copyWith(
        isRead: true,
        readAt: DateTime.now(),
      );

      if (_unreadCount > 0) {
        _unreadCount--;
      }
    });

    try {
      await widget.notificationService.markRead(
        churchId: widget.churchId,
        notificationId: notification.id,
      );
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _notifications[index] = previous;
        _unreadCount++;
      });

      _showMessage('Could not mark notification as read.');
    }
  }

  Future<void> _markAllRead() async {
    if (_unreadCount == 0 || _markingAll) return;

    setState(() => _markingAll = true);

    final previousNotifications = List<NotificationModel>.from(_notifications);
    final previousUnreadCount = _unreadCount;

    setState(() {
      _notifications = _notifications
          .map((item) => item.copyWith(isRead: true, readAt: DateTime.now()))
          .toList();

      _unreadCount = 0;
    });

    try {
      await widget.notificationService.markAllRead(churchId: widget.churchId);

      if (!mounted) return;

      setState(() => _markingAll = false);
      _showMessage('All notifications marked as read.');
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _notifications = previousNotifications;
        _unreadCount = previousUnreadCount;
        _markingAll = false;
      });

      _showMessage('Could not mark all notifications as read.');
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';

    return DateFormat('MMM d, yyyy • h:mm a').format(date);
  }

  IconData _iconForType(String type) {
    switch (type.toLowerCase()) {
      case 'event':
        return Icons.event;
      case 'payment':
      case 'finance':
        return Icons.account_balance_wallet_outlined;
      case 'announcement':
        return Icons.campaign_outlined;
      case 'content':
      case 'post':
        return Icons.article_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications'),
            if (_unreadCount > 0) ...[
              const SizedBox(width: 8),
              Badge(
                label: Text(
                  _unreadCount > 99 ? '99+' : _unreadCount.toString(),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (_unreadCount > 0)
            TextButton(
              onPressed: _markingAll ? null : _markAllRead,
              child: _markingAll
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Read all'),
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading && _notifications.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && _notifications.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 12),
              Text(
                'Could not load notifications.\n$_error',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => _loadInbox(refresh: true),
                child: const Text('Try again'),
              ),
            ],
          ),
        ),
      );
    }

    if (_notifications.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => _loadInbox(refresh: true),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 140),
            Icon(Icons.notifications_none, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Center(child: Text('You have no notifications yet.')),
            SizedBox(height: 20),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadInbox(refresh: true),
      child: ListView.separated(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: _notifications.length + (_loadingMore ? 1 : 0),
        separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
        itemBuilder: (context, index) {
          if (index >= _notifications.length) {
            return const Padding(
              padding: EdgeInsets.all(20),
              child: Center(child: CircularProgressIndicator()),
            );
          }

          return _buildNotificationTile(_notifications[index]);
        },
      ),
    );
  }

  Widget _buildNotificationTile(NotificationModel notification) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: CircleAvatar(
        backgroundColor: notification.isRead
            ? Theme.of(context).colorScheme.surfaceContainerHighest
            : Theme.of(context).colorScheme.primaryContainer,
        child: Icon(
          _iconForType(notification.notificationType),
          color: notification.isRead
              ? Theme.of(context).colorScheme.onSurfaceVariant
              : Theme.of(context).colorScheme.primary,
        ),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              notification.title,
              style: TextStyle(
                fontWeight: notification.isRead
                    ? FontWeight.normal
                    : FontWeight.bold,
              ),
            ),
          ),
          if (!notification.isRead)
            Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                shape: BoxShape.circle,
              ),
            ),
        ],
      ),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(notification.message),
            if (notification.sentAt != null) ...[
              const SizedBox(height: 8),
              Text(
                _formatDate(notification.sentAt),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ],
        ),
      ),
      onTap: () => _markOneRead(notification),
    );
  }
}
