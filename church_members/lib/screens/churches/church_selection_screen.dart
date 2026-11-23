import 'package:flutter/material.dart';

import '../../models/church_model.dart';
import '../../services/church_service.dart';
import '../../services/member_service.dart';
import '../auth/register_screen.dart';

class ChurchSelectionScreen extends StatefulWidget {
  final ChurchService churchService;
  final MemberService memberService;

  const ChurchSelectionScreen({
    super.key,
    required this.churchService,
    required this.memberService,
  });

  @override
  State<ChurchSelectionScreen> createState() => _ChurchSelectionScreenState();
}

class _ChurchSelectionScreenState extends State<ChurchSelectionScreen> {
  List<ChurchModel> _churches = [];
  List<ChurchModel> _filteredChurches = [];

  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadChurches();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadChurches() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final churches = await widget.churchService.getActiveChurches();

      if (!mounted) return;

      setState(() {
        _churches = churches;
        _filteredChurches = churches;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _errorMessage = error.toString();
        _isLoading = false;
      });
    }
  }

  void _searchChurches(String value) {
    final query = value.trim().toLowerCase();

    setState(() {
      _filteredChurches = _churches.where((church) {
        return church.name.toLowerCase().contains(query) ||
            church.code.toLowerCase().contains(query) ||
            (church.address ?? '').toLowerCase().contains(query);
      }).toList();
    });
  }

  void _selectChurch(ChurchModel church) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            RegisterScreen(church: church, memberService: widget.memberService),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Choose Your Church')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Join your church community',
                style: TextStyle(fontSize: 23, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Select your church to continue with registration.',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 20),

              TextField(
                controller: _searchController,
                onChanged: _searchChurches,
                decoration: InputDecoration(
                  hintText: 'Search churches...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              Expanded(child: _buildChurchList()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChurchList() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off, size: 45, color: Colors.grey),
            const SizedBox(height: 12),
            Text(_errorMessage!, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _loadChurches,
              child: const Text('Try again'),
            ),
          ],
        ),
      );
    }

    if (_filteredChurches.isEmpty) {
      return const Center(child: Text('No active churches found.'));
    }

    return RefreshIndicator(
      onRefresh: _loadChurches,
      child: ListView.separated(
        itemCount: _filteredChurches.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final church = _filteredChurches[index];

          return Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.all(14),
              leading: _buildChurchLogo(church),
              title: Text(
                church.name,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text(
                  [
                    'Code: ${church.code}',
                    if (church.address != null && church.address!.isNotEmpty)
                      church.address!,
                  ].join('\n'),
                ),
              ),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () => _selectChurch(church),
            ),
          );
        },
      ),
    );
  }

  Widget _buildChurchLogo(ChurchModel church) {
    if (church.logoUrl == null || church.logoUrl!.isEmpty) {
      return const CircleAvatar(child: Icon(Icons.church));
    }

    return CircleAvatar(
      backgroundImage: NetworkImage(church.logoUrl!),
      onBackgroundImageError: (_, _) {},
      child: null,
    );
  }
}
