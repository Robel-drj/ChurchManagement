import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../services/church_service.dart';
import '../../services/event_service.dart';
import '../../services/member_service.dart';
import '../../services/notification_service.dart';
import '../../services/payment_service.dart';
import '../../services/post_service.dart';
import '../../widgets/content_media_gallery.dart';
import '../../widgets/post_like_button.dart';
import '../auth/login_screen.dart';
import '../auth/change_password_screen.dart';
import '../posts/post_details_screen.dart';
import 'member_payments_page.dart';
import 'notification_bell_button.dart';

class MemberDashboard extends StatefulWidget {
  final UserModel user;
  final AuthService authService;
  final ChurchService churchService;
  final MemberService memberService;
  final PostService postService;
  final EventService eventService;
  final PaymentService paymentService;
  final NotificationService notificationService;

  const MemberDashboard({
    super.key,
    required this.user,
    required this.authService,
    required this.churchService,
    required this.memberService,
    required this.postService,
    required this.eventService,
    required this.paymentService,
    required this.notificationService,
  });

  @override
  State<MemberDashboard> createState() => _MemberDashboardState();
}

class _MemberDashboardState extends State<MemberDashboard> {
  int _selectedIndex = 0;

  String? get _activeChurchId {
    for (final item in widget.user.memberships) {
      if (item is! Map) continue;

      final membership = Map<String, dynamic>.from(item);

      final status =
          (membership['membership_status'] ??
                  membership['membershipStatus'] ??
                  membership['status'] ??
                  '')
              .toString()
              .toLowerCase();

      final churchId = (membership['church_id'] ?? membership['churchId'] ?? '')
          .toString();

      if (status == 'active' && churchId.isNotEmpty) {
        return churchId;
      }
    }

    return null;
  }
Future<void> _openChangePassword() async {
  final changed = await Navigator.of(context).push<bool>(
    MaterialPageRoute(
      builder: (_) => ChangePasswordScreen(authService: widget.authService),
    ),
  );

  if (!mounted || changed != true) return;

  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Password changed successfully.')),
  );
}
  Future<void> _logout() async {
    await widget.authService.logout();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => LoginScreen(
          authService: widget.authService,
          churchService: widget.churchService,
          memberService: widget.memberService,
          postService: widget.postService,
          eventService: widget.eventService,
          paymentService: widget.paymentService,
          notificationService: widget.notificationService,
        ),
      ),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final churchId = _activeChurchId;

    final pages = [
      _HomeTab(
        user: widget.user,
        churchId: churchId,
        postService: widget.postService,
        eventService: widget.eventService,
        notificationService: widget.notificationService,
      ),
      _PostsTab(churchId: churchId, postService: widget.postService),
      _EventsTab(churchId: churchId, eventService: widget.eventService),
      _PaymentsTab(churchId: churchId, paymentService: widget.paymentService),
     _ProfileTab(
  user: widget.user,
  onLogout: _logout,
  onChangePassword: _openChangePassword,
),
    ];

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(index: _selectedIndex, children: pages),
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
          boxShadow: [
            BoxShadow(
              color: Color(0x0F101828),
              blurRadius: 20,
              offset: Offset(0, -6),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: NavigationBar(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) {
              setState(() => _selectedIndex = index);
            },
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded),
                label: 'Home',
              ),
              NavigationDestination(
                icon: Icon(Icons.article_outlined),
                selectedIcon: Icon(Icons.article_rounded),
                label: 'Posts',
              ),
              NavigationDestination(
                icon: Icon(Icons.event_outlined),
                selectedIcon: Icon(Icons.event_rounded),
                label: 'Events',
              ),
              NavigationDestination(
                icon: Icon(Icons.volunteer_activism_outlined),
                selectedIcon: Icon(Icons.volunteer_activism_rounded),
                label: 'Giving',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline_rounded),
                selectedIcon: Icon(Icons.person_rounded),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  final UserModel user;
  final String? churchId;
  final PostService postService;
  final EventService eventService;
  final NotificationService notificationService;

  const _HomeTab({
    required this.user,
    required this.churchId,
    required this.postService,
    required this.eventService,
    required this.notificationService,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        if (churchId == null) return;
        await Future.wait([
          postService.getPublishedPosts(churchId!),
          eventService.getPublishedEvents(churchId!),
        ]);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 30),
        children: [
          _HomeHeader(
            user: user,
            churchId: churchId,
            notificationService: notificationService,
          ),
          const SizedBox(height: 24),
          const _SectionHeader(
            icon: Icons.campaign_outlined,
            title: 'Latest Posts',
            subtitle: 'News and messages from your church',
          ),
          const SizedBox(height: 12),
          if (churchId == null)
            const _EmptyMessage(
              icon: Icons.link_off_rounded,
              title: 'No active membership',
              message: 'No active church membership was found.',
            )
          else
            FutureBuilder<List<Map<String, dynamic>>>(
              future: postService.getPublishedPosts(churchId!),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const _LoadingCards(count: 2);
                }
                if (snapshot.hasError) {
                  return const _EmptyMessage(
                    icon: Icons.cloud_off_outlined,
                    title: 'Posts unavailable',
                    message: 'Could not load the latest posts.',
                  );
                }
                final posts = snapshot.data ?? [];
                if (posts.isEmpty) {
                  return const _EmptyMessage(
                    icon: Icons.article_outlined,
                    title: 'No posts yet',
                    message: 'There are no published posts yet.',
                  );
                }
                return Column(
                  children: posts.take(3).map((post) {
                    return _ContentCard(
                      data: post,
                      type: 'post',
                      churchId: churchId,
                      postService: postService,
                    );
                  }).toList(),
                );
              },
            ),
          const SizedBox(height: 14),
          const _SectionHeader(
            icon: Icons.calendar_month_outlined,
            title: 'Upcoming Events',
            subtitle: 'Gather, worship, and grow together',
          ),
          const SizedBox(height: 12),
          if (churchId != null)
            FutureBuilder<List<Map<String, dynamic>>>(
              future: eventService.getPublishedEvents(churchId!),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const _LoadingCards(count: 2);
                }
                if (snapshot.hasError) {
                  return const _EmptyMessage(
                    icon: Icons.cloud_off_outlined,
                    title: 'Events unavailable',
                    message: 'Could not load upcoming events.',
                  );
                }
                final events = snapshot.data ?? [];
                if (events.isEmpty) {
                  return const _EmptyMessage(
                    icon: Icons.event_busy_outlined,
                    title: 'Nothing scheduled',
                    message: 'There are no published events yet.',
                  );
                }
                return Column(
                  children: events.take(3).map((event) {
                    return _ContentCard(data: event, type: 'event');
                  }).toList(),
                );
              },
            ),
        ],
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  final UserModel user;
  final String? churchId;
  final NotificationService notificationService;

  const _HomeHeader({
    required this.user,
    required this.churchId,
    required this.notificationService,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(26),
        boxShadow: const [
          BoxShadow(
            color: Color(0x334F46E5),
            blurRadius: 26,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Stack(
        children: [
          const Positioned(
            right: -32,
            top: -38,
            child: _DecorativeOrb(size: 126),
          ),
          const Positioned(
            right: 54,
            bottom: -55,
            child: _DecorativeOrb(size: 92, opacity: 0.07),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _greeting(),
                          style: const TextStyle(
                            color: Color(0xD9FFFFFF),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _firstName(user.fullName.toUpperCase()),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 27,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.6,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (churchId != null) ...[
                    IconTheme(
                      data: const IconThemeData(color: Colors.white),
                      child: NotificationBellButton(
                        churchId: churchId!,
                        notificationService: notificationService,
                      ),
                    ),
                    const SizedBox(width: 4),
                  ],
                  Container(
                    width: 52,
                    height: 52,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.16),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Text(
                      _initials(user.fullName),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text(
                'Stay connected to what matters.',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Church updates, upcoming gatherings, and giving—all in one place.',
                style: TextStyle(
                  color: Color(0xD9FFFFFF),
                  fontSize: 13,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: const [
                  _HeroPill(
                    icon: Icons.favorite_outline_rounded,
                    label: 'Member space',
                  ),
                  _HeroPill(icon: Icons.verified_outlined, label: 'Connected'),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DecorativeOrb extends StatelessWidget {
  final double size;
  final double opacity;

  const _DecorativeOrb({required this.size, this.opacity = 0.1});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: opacity),
        shape: BoxShape.circle,
      ),
    );
  }
}

class _HeroPill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _HeroPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 14),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _SectionHeader({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: const Color(0xFFE0E7FF),
            borderRadius: BorderRadius.circular(13),
          ),
          child: Icon(icon, color: AppColors.primary, size: 21),
        ),
        const SizedBox(width: 11),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PostsTab extends StatelessWidget {
  final String? churchId;
  final PostService postService;

  const _PostsTab({required this.churchId, required this.postService});

  @override
  Widget build(BuildContext context) {
    if (churchId == null) {
      return const _CenteredEmpty(
        child: _EmptyMessage(
          icon: Icons.link_off_rounded,
          title: 'No active membership',
          message: 'No active church membership was found.',
        ),
      );
    }

    return _DataListPage(
      title: 'Church Posts',
      subtitle: 'Messages, news, and inspiration from your church.',
      icon: Icons.article_outlined,
      future: postService.getPublishedPosts(churchId!),
      type: 'post',
      churchId: churchId,
      postService: postService,
    );
  }
}

class _EventsTab extends StatelessWidget {
  final String? churchId;
  final EventService eventService;

  const _EventsTab({required this.churchId, required this.eventService});

  @override
  Widget build(BuildContext context) {
    if (churchId == null) {
      return const _CenteredEmpty(
        child: _EmptyMessage(
          icon: Icons.link_off_rounded,
          title: 'No active membership',
          message: 'No active church membership was found.',
        ),
      );
    }

    return _DataListPage(
      title: 'Church Events',
      subtitle: 'Discover what is happening in your church community.',
      icon: Icons.calendar_month_outlined,
      future: eventService.getPublishedEvents(churchId!),
      type: 'event',
    );
  }
}

class _PaymentsTab extends StatelessWidget {
  final String? churchId;
  final PaymentService paymentService;

  const _PaymentsTab({required this.churchId, required this.paymentService});

  @override
  Widget build(BuildContext context) {
    if (churchId == null) {
      return const _CenteredEmpty(
        child: _EmptyMessage(
          icon: Icons.link_off_rounded,
          title: 'No active membership',
          message: 'No active church membership was found.',
        ),
      );
    }

    return MemberPaymentsPage(
      churchId: churchId!,
      paymentService: paymentService,
    );
  }
}

class _ProfileTab extends StatelessWidget {
  final UserModel user;
  final VoidCallback onLogout;
final VoidCallback onChangePassword;
  const _ProfileTab({required this.user, required this.onLogout, required this.onChangePassword});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 30),
      children: [
        const _PageTitle(
          eyebrow: 'YOUR ACCOUNT',
          title: 'My Profile',
          subtitle: 'Your member identity and contact information.',
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
            borderRadius: BorderRadius.circular(26),
            boxShadow: const [
              BoxShadow(
                color: Color(0x334F46E5),
                blurRadius: 24,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                width: 82,
                height: 82,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white30, width: 2),
                ),
                child: Text(
                  _initials(user.fullName.toUpperCase()),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 25,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                user.fullName.toUpperCase(),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 9),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.verified_rounded,
                      color: Color(0xFF6EE7B7),
                      size: 15,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      _titleCase(user.accountStatus),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        const Text(
          'Personal details',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              _ProfileInfoRow(
                icon: Icons.person_outline_rounded,
                label: 'Full name',
                value: user.fullName,
              ),
              const Divider(indent: 68),
              _ProfileInfoRow(
                icon: Icons.phone_outlined,
                label: 'Phone',
                value: user.phone,
              ),
              const Divider(indent: 68),
              _ProfileInfoRow(
                icon: Icons.email_outlined,
                label: 'Email',
                value: user.email ?? 'Not provided',
              ),
              const Divider(indent: 68),
              _ProfileInfoRow(
                icon: Icons.verified_user_outlined,
                label: 'Account status',
                value: _titleCase(user.accountStatus),
                valueColor: user.accountStatus.toLowerCase() == 'active'
                    ? AppColors.success
                    : AppColors.textPrimary,
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        OutlinedButton.icon(
  onPressed: onChangePassword,
  icon: const Icon(Icons.lock_outline),
  label: const Text('Change Password'),
),
const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: onLogout,
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Sign out'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.error,
            side: const BorderSide(color: Color(0xFFFECACA)),
            backgroundColor: const Color(0xFFFEF2F2),
          ),
        ),
      ],
    );
  }
}

class _ProfileInfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _ProfileInfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(icon, color: AppColors.primary, size: 21),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: TextStyle(
                    color: valueColor ?? AppColors.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
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

class _DataListPage extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Future<List<Map<String, dynamic>>> future;
  final String type;
  final String? churchId;
  final PostService? postService;

  const _DataListPage({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.future,
    required this.type,
    this.churchId,
    this.postService,
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: future,
      builder: (context, snapshot) {
        return ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 30),
          children: [
            _PageTitle(
              eyebrow: type == 'post' ? 'STAY INFORMED' : 'COME TOGETHER',
              title: title,
              subtitle: subtitle,
              icon: icon,
            ),
            const SizedBox(height: 22),
            if (snapshot.connectionState == ConnectionState.waiting)
              const _LoadingCards(count: 3)
            else if (snapshot.hasError)
              const _EmptyMessage(
                icon: Icons.cloud_off_outlined,
                title: 'Unable to load',
                message: 'Unable to load information. Please try again.',
              )
            else if ((snapshot.data ?? []).isEmpty)
              _EmptyMessage(
                icon: type == 'post'
                    ? Icons.article_outlined
                    : Icons.event_busy_outlined,
                title: type == 'post' ? 'No posts yet' : 'No events yet',
                message: 'Nothing has been published yet.',
              )
            else
              ...(snapshot.data ?? []).map(
                (item) => _ContentCard(
                  data: item,
                  type: type,
                  churchId: churchId,
                  postService: postService,
                ),
              ),
          ],
        );
      },
    );
  }
}

class _PageTitle extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String subtitle;
  final IconData? icon;

  const _PageTitle({
    required this.eyebrow,
    required this.title,
    required this.subtitle,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (icon != null) ...[
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(17),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x294F46E5),
                  blurRadius: 18,
                  offset: Offset(0, 7),
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 27),
          ),
          const SizedBox(width: 14),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                eyebrow,
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 4),
              Text(title, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 5),
              Text(
                subtitle,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ContentCard extends StatefulWidget {
  final Map<String, dynamic> data;
  final String type;
  final String? churchId;
  final PostService? postService;

  const _ContentCard({
    required this.data,
    required this.type,
    this.churchId,
    this.postService,
  });

  @override
  State<_ContentCard> createState() => _ContentCardState();
}

class _ContentCardState extends State<_ContentCard> {
  @override
  Widget build(BuildContext context) {
    final data = widget.data;
    final type = widget.type;
    final churchId = widget.churchId;
    final postService = widget.postService;
    final isPost = type == 'post';
    final title = _firstValue(
      data,
      isPost
          ? ['title', 'post_title', 'name']
          : ['title', 'event_title', 'name'],
      isPost ? 'Church Post' : 'Church Event',
    );

    final description = _firstValue(data, [
      'content',
      'description',
      'body',
      'message',
    ], '');

    final rawDate = _firstValue(data, [
      'event_date',
      'start_date',
      'published_at',
      'created_at',
    ], '');
    final location = _firstValue(data, ['location', 'venue', 'address'], '');
    final postType = _firstValue(data, ['post_type', 'type'], '');
    final postId = _firstValue(data, ['id', 'post_id', 'postId'], '');
    final canLike =
        isPost && postId.isNotEmpty && churchId != null && postService != null;

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: isPost ? () => _openPostDetails(context) : null,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isPost
                          ? const Color(0xFFE0E7FF)
                          : const Color(0xFFCCFBF1),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      isPost
                          ? Icons.campaign_outlined
                          : Icons.calendar_month_outlined,
                      color: isPost ? AppColors.primary : AppColors.secondary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 7,
                          runSpacing: 5,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            _TypeBadge(label: isPost ? 'POST' : 'EVENT'),
                            if (isPost && postType.isNotEmpty)
                              Text(
                                _titleCase(postType),
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          title,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                            fontSize: 17,
                            height: 1.25,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (rawDate.isNotEmpty || (!isPost && location.isNotEmpty)) ...[
                const SizedBox(height: 13),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    if (rawDate.isNotEmpty)
                      _MetadataItem(
                        icon: Icons.schedule_rounded,
                        label: _formatDate(rawDate),
                      ),
                    if (!isPost && location.isNotEmpty)
                      _MetadataItem(
                        icon: Icons.location_on_outlined,
                        label: location,
                      ),
                  ],
                ),
              ],
              ContentMediaGallery(media: data['media'], enableDownload: isPost),
              if (description.isNotEmpty) ...[
                const SizedBox(height: 13),
                Text(
                  description,
                  maxLines: isPost ? 3 : null,
                  overflow: isPost ? TextOverflow.ellipsis : null,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                    height: 1.55,
                  ),
                ),
              ],
              if (isPost) ...[
                const SizedBox(height: 14),
                const Divider(),
                const SizedBox(height: 11),
                Row(
                  children: [
                    if (canLike)
                      PostLikeButton(
                        churchId: churchId,
                        postId: postId,
                        postService: postService,
                        initiallyLiked: _boolValue(data, [
                          'liked_by_me',
                          'likedByMe',
                        ]),
                        initialLikeCount: _intValue(data, [
                          'like_count',
                          'likeCount',
                        ]),
                        onChanged: _applyLikeState,
                        showLabel: false,
                      ),
                    const Spacer(),
                    const Icon(
                      Icons.menu_book_rounded,
                      color: AppColors.primary,
                      size: 18,
                    ),
                    const SizedBox(width: 7),
                    const Text(
                      'Read post',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(width: 5),
                    const Icon(
                      Icons.arrow_forward_rounded,
                      color: AppColors.primary,
                      size: 18,
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openPostDetails(BuildContext context) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PostDetailsScreen(
          post: widget.data,
          churchId: widget.churchId,
          postService: widget.postService,
        ),
      ),
    );

    if (mounted) setState(() {});
  }

  void _applyLikeState(PostLikeState state) {
    if (!mounted) return;

    setState(() {
      widget.data['liked_by_me'] = state.liked;
      widget.data['like_count'] = state.likeCount;
    });
  }
}

class _TypeBadge extends StatelessWidget {
  final String label;

  const _TypeBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(7),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 9,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.7,
        ),
      ),
    );
  }
}

class _MetadataItem extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MetadataItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: AppColors.textSecondary),
        const SizedBox(width: 5),
        Flexible(
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

class _LoadingCards extends StatelessWidget {
  final int count;

  const _LoadingCards({required this.count});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        count,
        (index) => Container(
          height: 126,
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Placeholder(width: 44, height: 44, radius: 14),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Placeholder(width: 66, height: 10),
                    SizedBox(height: 10),
                    _Placeholder(width: double.infinity, height: 15),
                    SizedBox(height: 9),
                    _Placeholder(width: 180, height: 12),
                    SizedBox(height: 16),
                    _Placeholder(width: 125, height: 10),
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

class _Placeholder extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const _Placeholder({
    required this.width,
    required this.height,
    this.radius = 6,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class _CenteredEmpty extends StatelessWidget {
  final Widget child;

  const _CenteredEmpty({required this.child});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(padding: const EdgeInsets.all(20), child: child),
    );
  }
}

class _EmptyMessage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;

  const _EmptyMessage({
    required this.icon,
    required this.title,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: const BoxDecoration(
              color: AppColors.surfaceMuted,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.textSecondary, size: 27),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 5),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

String _firstValue(
  Map<String, dynamic> data,
  List<String> keys,
  String fallback,
) {
  for (final key in keys) {
    final value = data[key];
    if (value != null && value.toString().trim().isNotEmpty) {
      return value.toString();
    }
  }
  return fallback;
}

bool _boolValue(Map<String, dynamic> data, List<String> keys) {
  for (final key in keys) {
    final value = data[key];
    if (value is bool) return value;
    if (value != null) return value.toString().toLowerCase() == 'true';
  }

  return false;
}

int _intValue(Map<String, dynamic> data, List<String> keys) {
  for (final key in keys) {
    final value = data[key];
    if (value is num) return value.toInt();
    final parsed = int.tryParse(value?.toString() ?? '');
    if (parsed != null) return parsed;
  }

  return 0;
}

String _formatDate(String value) {
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;

  return DateFormat('EEE, MMM d • h:mm a').format(parsed.toLocal());
}

String _firstName(String fullName) {
  final parts = fullName.trim().split(RegExp(r'\s+'));
  return parts.isEmpty || parts.first.isEmpty ? 'Friend' : parts.first;
}

String _initials(String fullName) {
  final parts = fullName
      .trim()
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .toList();

  if (parts.isEmpty) return 'CM';
  if (parts.length == 1) {
    return parts.first.substring(0, 1).toUpperCase();
  }

  return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
}

String _titleCase(String value) {
  if (value.trim().isEmpty) return value;

  return value
      .replaceAll('_', ' ')
      .split(' ')
      .where((word) => word.isNotEmpty)
      .map(
        (word) => '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}',
      )
      .join(' ');
}

String _greeting() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}
