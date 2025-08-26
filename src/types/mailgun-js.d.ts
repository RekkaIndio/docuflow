declare module 'mailgun.js' {
  import type FormData from 'form-data';

  type Client = {
    messages: {
      create(domain: string, data: any): Promise<any>;
    };
  };

  export default class Mailgun {
    constructor(formData: typeof FormData);
    client(options: { username?: string; key: string; url?: string }): Client;
  }
}
