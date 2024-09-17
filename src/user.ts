export enum UserStatus {
  ACTIVE = "active",
  INCOMPLETE_PROFILE = "incomplete_profile",
}

export enum SignInProvider {
  KAKAO = "kakao",
  APPLE = "apple",
}

export enum UserGrade {
  First = 1,
  Second = 2,
  Third = 3,
}

export interface User {
  id: number;
  status: UserStatus;
  provider: SignInProvider;
  schoolId: number;
  schoolName: number;
  grade: UserGrade;
  className: string;
  fullName: string;
  profileImageUrl: string;
  backgroundImageUrl: string;
  isClassPublic: boolean;
  isTimetablePublic: boolean;
  notificationsEnabled: boolean;
}
