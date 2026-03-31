import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PythonAiService {
  private readonly baseUrl = 'http://localhost:8000';

  async analyzeMarket(payload: {
    topic: string;
    region: string;
  }) {
    const response = await axios.post(`${this.baseUrl}/analyze`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }
}