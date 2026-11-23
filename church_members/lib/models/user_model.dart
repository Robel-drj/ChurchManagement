class UserModel {
  final String id;
  final String fullName;
  final String phone;
  final String? email;
  final String accountStatus;
  final List<dynamic> platformRoles;
  final List<dynamic> memberships;

  UserModel({
    required this.id,
    required this.fullName,
    required this.phone,
    this.email,
    required this.accountStatus,
    required this.platformRoles,
    required this.memberships,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ??
          json['full_name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      email: json['email']?.toString(),
      accountStatus: json['accountStatus']?.toString() ??
          json['account_status']?.toString() ?? '',
      platformRoles: json['platformRoles'] is List
          ? json['platformRoles']
          : [],
      memberships: json['memberships'] is List
          ? json['memberships']
          : [],
    );
  }
}
