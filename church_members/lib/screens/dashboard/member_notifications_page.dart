import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
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
    final local = date.toLocal();
    final diff = DateTime.now().difference(local);

    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays == 1) {
      return 'Yesterday • ${DateFormat('h:mm a').format(local)}';
    }
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('MMM d, yyyy • h:mm a').format(local);
  }

  _NotificationVisual _visualForType(String type) {
    switch (type.toLowerCase()) {
      case 'event':
        return const _NotificationVisual(
          icon: Icons.event_available_rounded,
          color: Color(0xFF0D9488),
          bgColor: Color(0xFFCCFBF1),
          label: 'EVENT',
        );
      case 'payment':
      case 'finance':
        return const _NotificationVisual(
          icon: Icons.volunteer_activism_rounded,
          color: Color(0xFF059669),
          bgColor: Color(0xFFD1FAE5),
          label: 'GIVING',
        );
      case 'announcement':
        return const _NotificationVisual(
          icon: Icons.campaign_rounded,
          color: Color(0xFFD97706),
          bgColor: Color(0xFFFEF3C7),
          label: 'ANNOUNCEMENT',
        );
      case 'content':
      case 'post':
        return const _NotificationVisual(
          icon: Icons.article_rounded,
          color: AppColors.primary,
          bgColor: Color(0xFFE0E7FF),
          label: 'POST',
        );
      default:
        return const _NotificationVisual(
          icon: Icons.notifications_rounded,
          color: AppColors.primary,
          bgColor: Color(0xFFE0E7FF),
          label: 'UPDATE',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0.5,
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 4,
        title: Row(
          children: [
            const Text(
              'Activity',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.4,
              ),
            ),
            if (_unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 9,
                  vertical: 3.5,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _unreadCount > 99 ? '99+ new' : '$_unreadCount new',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (_unreadCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: TextButton.icon(
                onPressed: _markingAll ? null : _markAllRead,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.08),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                ),
                icon: _markingAll
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      )
                    : const Icon(Icons.done_all_rounded, size: 16),
                label: const Text(
                  'Mark all read',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(
            height: 1,
            color: AppColors.border.withValues(alpha: 0.7),
          ),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading && _notifications.isEmpty) {
      return ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: 6,
        itemBuilder: (_, _) => const _NotificationSkeletonCard(),
      );
    }

    if (_error != null && _notifications.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFEE2E2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.cloud_off_rounded,
                    size: 26,
                    color: AppColors.error,
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Unable to load notifications',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '$_error',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: () => _loadInbox(refresh: true),
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_notifications.isEmpty) {
      return RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => _loadInbox(refresh: true),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 90),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.notifications_none_rounded,
                      size: 32,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'All caught up!',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'You have no notifications yet. Church updates, event reminders, and giving receipts will appear here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => _loadInbox(refresh: true),
      child: ListView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
        itemCount: _notifications.length + (_loadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index >= _notifications.length) {
            return const Padding(
              padding: EdgeInsets.all(20),
              child: Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            );
          }

          return _buildNotificationTile(_notifications[index]);
        },
      ),
    );
  }

  Widget _buildNotificationTile(NotificationModel notification) {
    final visual = _visualForType(notification.notificationType);
    final isUnread = !notification.isRead;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isUnread
            ? const Color(0xFFF5F7FF)
            : AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isUnread
              ? AppColors.primary.withValues(alpha: 0.28)
              : AppColors.border.withValues(alpha: 0.85),
          width: isUnread ? 1.2 : 1,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x05101828),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _markOneRead(notification),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Category Icon Avatar + Unread Dot
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isUnread
                          ? visual.bgColor
                          : AppColors.surfaceMuted,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      visual.icon,
                      size: 21,
                      color: isUnread
                          ? visual.color
                          : AppColors.textSecondary,
                    ),
                  ),
                  if (isUnread)
                    Positioned(
                      top: -1,
                      left: -1,
                      child: Container(
                        width: 11,
                        height: 11,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: const Color(0xFFF5F7FF),
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              // Notification Body
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: isUnread
                                ? visual.color.withValues(alpha: 0.12)
                                : AppColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            visual.label,
                            style: TextStyle(
                              color: isUnread
                                  ? visual.color
                                  : AppColors.textSecondary,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const Spacer(),
                        if (notification.sentAt != null)
                          Text(
                            _formatDate(notification.sentAt),
                            style: TextStyle(
                              color: isUnread
                                  ? AppColors.primary
                                  : AppColors.textSecondary,
                              fontSize: 11,
                              fontWeight: isUnread
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      notification.title,
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14.5,
                        fontWeight: isUnread
                            ? FontWeight.w800
                            : FontWeight.w600,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.message,
                      style: TextStyle(
                        color: isUnread
                            ? AppColors.textPrimary.withValues(alpha: 0.85)
                            : AppColors.textSecondary,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationVisual {
  final IconData icon;
  final Color color;
  final Color bgColor;
  final String label;

  const _NotificationVisual({
    required this.icon,
    required this.color,
    required this.bgColor,
    required this.label,
  });
}

class _NotificationSkeletonCard extends StatelessWidget {
  const _NotificationSkeletonCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: AppColors.surfaceMuted,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 72,
                  height: 12,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  width: 180,
                  height: 14,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  height: 12,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}