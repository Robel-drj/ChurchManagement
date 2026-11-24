import 'package:flutter/material.dart';

import '../core/network/api_exceptions.dart';
import '../core/theme/app_colors.dart';
import '../services/post_service.dart';

class PostLikeButton extends StatefulWidget {
  final String churchId;
  final String postId;
  final PostService postService;
  final bool initiallyLiked;
  final int initialLikeCount;
  final ValueChanged<PostLikeState>? onChanged;
  final bool showLabel;

  const PostLikeButton({
    super.key,
    required this.churchId,
    required this.postId,
    required this.postService,
    required this.initiallyLiked,
    required this.initialLikeCount,
    this.onChanged,
    this.showLabel = true,
  });

  @override
  State<PostLikeButton> createState() => _PostLikeButtonState();
}

class _PostLikeButtonState extends State<PostLikeButton> {
  late bool _liked;
  late int _likeCount;
  bool _updating = false;

  @override
  void initState() {
    super.initState();
    _setInitialState();
  }

  @override
  void didUpdateWidget(covariant PostLikeButton oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.postId != widget.postId ||
        (!_updating &&
            (oldWidget.initiallyLiked != widget.initiallyLiked ||
                oldWidget.initialLikeCount != widget.initialLikeCount))) {
      _setInitialState();
    }
  }

  void _setInitialState() {
    _liked = widget.initiallyLiked;
    _likeCount = widget.initialLikeCount < 0 ? 0 : widget.initialLikeCount;
  }

  Future<void> _toggleLike() async {
    if (_updating) return;

    final previous = PostLikeState(liked: _liked, likeCount: _likeCount);
    final shouldLike = !_liked;
    final optimistic = PostLikeState(
      liked: shouldLike,
      likeCount: (_likeCount + (shouldLike ? 1 : -1)).clamp(0, 1 << 31),
    );

    setState(() {
      _liked = optimistic.liked;
      _likeCount = optimistic.likeCount;
      _updating = true;
    });
    widget.onChanged?.call(optimistic);

    try {
      final state = await widget.postService.setPostLiked(
        churchId: widget.churchId,
        postId: widget.postId,
        liked: shouldLike,
      );

      if (!mounted) return;
      setState(() {
        _liked = state.liked;
        _likeCount = state.likeCount;
        _updating = false;
      });
      widget.onChanged?.call(state);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _liked = previous.liked;
        _likeCount = previous.likeCount;
        _updating = false;
      });
      widget.onChanged?.call(previous);

      final message = error is ApiException
          ? error.message
          : 'Unable to update this like. Please try again.';
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _liked ? const Color(0xFFE11D48) : AppColors.textSecondary;
    final background = _liked
        ? const Color(0xFFFFE4E9)
        : AppColors.surfaceMuted;
    final label = _liked ? 'Unlike post' : 'Like post';

    return Tooltip(
      message: label,
      child: Semantics(
        button: true,
        selected: _liked,
        label: '$label. $_likeCount likes',
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: _updating ? null : _toggleLike,
            borderRadius: BorderRadius.circular(12),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_updating)
                    SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: color,
                      ),
                    )
                  else
                    Icon(
                      _liked
                          ? Icons.favorite_rounded
                          : Icons.favorite_border_rounded,
                      color: color,
                      size: 19,
                    ),
                  if (widget.showLabel) ...[
                    const SizedBox(width: 7),
                    Text(
                      _liked ? 'Liked' : 'Like',
                      style: TextStyle(
                        color: color,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                  const SizedBox(width: 7),
                  Text(
                    '$_likeCount',
                    style: TextStyle(
                      color: color,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
