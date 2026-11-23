class MembershipModel {
  final String id;
  final String churchId;
  final String? memberNumber;
  final String status;

  MembershipModel({
    required this.id,
    required this.churchId,
    this.memberNumber,
    required this.status,
  });

  factory MembershipModel.fromJson(Map<String, dynamic> json) {
    return MembershipModel(
      id: json['id']?.toString() ??
          json['membership_id']?.toString() ?? '',
      churchId: json['church_id']?.toString() ??
          json['churchId']?.toString() ?? '',
      memberNumber: json['member_number']?.toString(),
      status: json['membership_status']?.toString() ??
          json['status']?.toString() ?? '',
    );
  }
}