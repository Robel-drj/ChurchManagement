import '../core/network/api_client.dart';

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
}