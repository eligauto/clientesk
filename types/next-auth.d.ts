import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    tenantId: string;
    tenantName: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      tenantId: string;
      tenantName: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId: string;
    tenantName: string;
  }
}
