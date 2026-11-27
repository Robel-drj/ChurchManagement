import '../core/network/api_client.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';

import '../core/network/api_exceptions.dart';
class MemberService {
  final ApiClient _apiClient;

  MemberService(this._apiClient);

  Future<Map<String, dynamic>> registerMember({
    required String churchId,
    required String fullName,
    required String phone,
    required String password,
    String? email,
    String? gender,
    String? dateOfBirth,
    String? address,
    String? emergencyContact,
  }) async {
    final response = await _apiClient.post(
      '/churches/$churchId/register',
      data: {
        'full_name': fullName.trim(),
        'phone': phone.trim(),
        'password': password,
        'email': _emptyToNull(email),
        'gender': _emptyToNull(gender),
        'date_of_birth': _emptyToNull(dateOfBirth),
        'address': _emptyToNull(address),
        'emergency_contact': _emptyToNull(emergencyContact),
      },
    );

    if (response is Map) {
      return Map<String, dynamic>.from(response);
    }

    throw Exception('The server returned an invalid registration response.');
  }

  String? _emptyToNull(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }

    return value.trim();
  }
  Future<String> uploadProfilePicture(String churchId, XFile photo) async {
  const maxBytes = 5 * 1024 * 1024;

  if (await photo.length() > maxBytes) {
    throw ApiException(message: 'The profile photo cannot exceed 5 MB.');
  }

  final response = await _apiClient.post(
    '/churches/$churchId/my-profile/photo',
    data: FormData.fromMap({
      'photo': MultipartFile.fromBytes(
        await photo.readAsBytes(),
        filename: photo.name,
      ),
    }),
  );

  final photoUrl = response['data']?['profileImage'];
  if (photoUrl is! String || photoUrl.isEmpty) {
    throw ApiException(message: 'The server did not return the uploaded photo.');
  }

  return photoUrl;
}
}