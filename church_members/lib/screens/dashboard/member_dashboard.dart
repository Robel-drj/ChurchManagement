import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../services/church_service.dart';
import '../../services/member_service.dart';
import '../../services/post_service.dart';
import '../../services/event_service.dart';
import '../../services/payment_service.dart';
import '../auth/login_screen.dart';
import 'member_payments_page.dart';

class MemberDashboard extends StatefulWidget {
  final UserModel user;
  final AuthService authService;
  final ChurchService churchService;
  final MemberService memberService;
  final PostService postService;
  final EventService eventService;
  final PaymentService paymentService;

  const MemberDashboard({
    super.key,
    required this.user,
    required this.authService,
    required this.churchService,
    required this.memberService,
    required this.postService,
    required this.eventService,
    required this.paymentService,
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
      ),
      _PostsTab(churchId: churchId, postService: widget.postService),
      _EventsTab(churchId: churchId, eventService: widget.eventService),
      _PaymentsTab(churchId: churchId, paymentService: widget.paymentService),
      _ProfileTab(user: widget.user, onLogout: _logout),
    ];

    return Scaffold(
      body: SafeArea(
        child: IndexedStack(index: _selectedIndex, children: pages),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() => _selectedIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.article_outlined),
            selectedIcon: Icon(Icons.article),
            label: 'Posts',
          ),
          NavigationDestination(
            icon: Icon(Icons.event_outlined),
            selectedIcon: Icon(Icons.event),
            label: 'Events',
          ),
          NavigationDestination(
            icon: Icon(Icons.payments_outlined),
            selectedIcon: Icon(Icons.payments),
            label: 'Payments',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  final UserModel user;
  final String? churchId;
  final PostService postService;
  final EventService eventService;

  const _HomeTab({
    required this.user,
    required this.churchId,
    required this.postService,
    required this.eventService,
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
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Welcome back,',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 15),
          ),
          const SizedBox(height: 5),
          Text(
            user.fullName,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 26,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.church, color: Colors.white, size: 38),
                SizedBox(height: 14),
                Text(
                  'Stay Connected',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 7),
                Text(
                  'Stay updated with your church announcements, events and information.',
                  style: TextStyle(color: Colors.white),
                ),
              ],
            ),
          ),
          const SizedBox(height: 25),
          const Text(
            'Latest Posts',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          if (churchId == null)
            const _EmptyMessage(
              message: 'No active church membership was found.',
            )
          else
            FutureBuilder<List<Map<String, dynamic>>>(
              future: postService.getPublishedPosts(churchId!),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return const _EmptyMessage(
                    message: 'Could not load the latest posts.',
                  );
                }
                final posts = snapshot.data ?? [];
                if (posts.isEmpty) {
                  return const _EmptyMessage(
                    message: 'There are no published posts yet.',
                  );
                }
                return Column(
                  children: posts.take(3).map((post) {
                    return _ContentCard(data: post, type: 'post');
                  }).toList(),
                );
              },
            ),
          const SizedBox(height: 20),
          const Text(
            'Upcoming Events',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          if (churchId != null)
            FutureBuilder<List<Map<String, dynamic>>>(
              future: eventService.getPublishedEvents(churchId!),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return const _EmptyMessage(message: 'Could not load events.');
                }
                final events = snapshot.data ?? [];
                if (events.isEmpty) {
                  return const _EmptyMessage(
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

class _PostsTab extends StatelessWidget {
  final String? churchId;
  final PostService postService;

  const _PostsTab({required this.churchId, required this.postService});

  @override
  Widget build(BuildContext context) {
    if (churchId == null) {
      return const _EmptyMessage(
        message: 'No active church membership was found.',
      );
    }

    return _DataListPage(
      title: 'Church Posts',
      future: postService.getPublishedPosts(churchId!),
      type: 'post',
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
      return const _EmptyMessage(
        message: 'No active church membership was found.',
      );
    }

    return _DataListPage(
      title: 'Church Events',
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
      return const _EmptyMessage(
        message: 'No active church membership was found.',
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

  const _ProfileTab({required this.user, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'My Profile',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 25),
        CircleAvatar(
          radius: 42,
          backgroundColor: AppColors.primary.withValues(alpha: 0.12),
          child: const Icon(Icons.person, size: 45, color: AppColors.primary),
        ),
        const SizedBox(height: 20),
        _SimpleInfoTile(
          icon: Icons.person_outline,
          title: 'Full Name',
          subtitle: user.fullName,
        ),
        _SimpleInfoTile(
          icon: Icons.phone_outlined,
          title: 'Phone',
          subtitle: user.phone,
        ),
        _SimpleInfoTile(
          icon: Icons.email_outlined,
          title: 'Email',
          subtitle: user.email ?? 'Not provided',
        ),
        _SimpleInfoTile(
          icon: Icons.verified_user_outlined,
          title: 'Account Status',
          subtitle: user.accountStatus,
        ),
        const SizedBox(height: 25),
        FilledButton.icon(
          onPressed: onLogout,
          icon: const Icon(Icons.logout),
          label: const Text('Logout'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.error,
            padding: const EdgeInsets.symmetric(vertical: 15),
          ),
        ),
      ],
    );
  }
}

class _DataListPage extends StatelessWidget {
  final String title;
  final Future<List<Map<String, dynamic>>> future;
  final String type;

  const _DataListPage({
    required this.title,
    required this.future,
    required this.type,
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: future,
      builder: (context, snapshot) {
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            if (snapshot.connectionState == ConnectionState.waiting)
              const Center(child: CircularProgressIndicator())
            else if (snapshot.hasError)
              const _EmptyMessage(
                message: 'Unable to load information. Pull down to retry.',
              )
            else if ((snapshot.data ?? []).isEmpty)
              const _EmptyMessage(message: 'Nothing has been published yet.')
            else
              ...(snapshot.data ?? []).map(
                (item) => _ContentCard(data: item, type: type),
              ),
          ],
        );
      },
    );
  }
}

class _ContentCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final String type;

  const _ContentCard({required this.data, required this.type});

  @override
  Widget build(BuildContext context) {
    final title = _firstValue(
      data,
      type == 'post'
          ? ['title', 'post_title', 'name']
          : ['title', 'event_title', 'name'],
      type == 'post' ? 'Church Post' : 'Church Event',
    );

    final description = _firstValue(data, [
      'content',
      'description',
      'body',
      'message',
    ], '');

    final date = _firstValue(data, [
      'event_date',
      'start_date',
      'published_at',
      'created_at',
    ], '');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  type == 'post' ? Icons.article : Icons.event,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 17,
                    ),
                  ),
                ),
              ],
            ),
            if (date.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                date,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
            if (description.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(description),
            ],
          ],
        ),
      ),
    );
  }
}

class _SimpleInfoTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _SimpleInfoTile({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary),
        title: Text(title),
        subtitle: subtitle.isEmpty ? null : Text(subtitle),
      ),
    );
  }
}

class _EmptyMessage extends StatelessWidget {
  final String message;

  const _EmptyMessage({required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Center(
        child: Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textSecondary),
        ),
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
