// export class Staff {
//     userName!: string;
//     firstName!: string;
//     lastName!: string;
//     email!: string;
//     password!: string;
//     mobileCode!: string;
//     mobileNumber!: string;
//     country!: string;
//     state!: string;
//     city!: string;
//     address!: string;
//     departmentId!: number;
//     pincode!: number;
// }

export class Staff {
  userName!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  password!: string;

  mobileCode!: string;
  mobileNumber!: string;

  country!: string;
  state!: string;
  city!: string;
  address!: string;
  pincode!: number;

  departmentId!: number;
  staffType!: 'SUPERADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'DRIVER' | 'ACCOUNTANT';
  isActive!: boolean;
  dob!: Date;
}
