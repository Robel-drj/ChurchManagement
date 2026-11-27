import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
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
    final hasUnread = _unreadCount > 0;
    final badgeText = _unreadCount > 99 ? '99+' : _unreadCount.toString();

    return Tooltip(
      message: 'Notifications',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _openInbox,
          borderRadius: BorderRadius.circular(50),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOut,
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: hasUnread
                  ? AppColors.primary.withValues(alpha: 0.12)
                  : AppColors.surfaceMuted,
              shape: BoxShape.circle,
              border: Border.all(
                color: hasUnread
                    ? AppColors.primary.withValues(alpha: 0.25)
                    : AppColors.border.withValues(alpha: 0.7),
              ),
            ),
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                Icon(
                  hasUnread
                      ? Icons.notifications_rounded
                      : Icons.notifications_none_rounded,
                  size: 22,
                  color: hasUnread ? AppColors.primary : AppColors.textPrimary,
                ),
                if (hasUnread)
                  Positioned(
                    top: -3,
                    right: -4,
                    child: Container(
                      constraints: const BoxConstraints(
                        minWidth: 19,
                        minHeight: 19,
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: AppColors.surface,
                          width: 1.8,
                        ),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x33EF4444),
                            blurRadius: 6,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        badgeText,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          height: 1.0,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                  )
                else if (_loading)
                  Positioned(
                    top: 9,
                    right: 10,
                    child: Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.5),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}