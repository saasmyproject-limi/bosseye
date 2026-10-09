import { NextRequest, NextResponse } from 'next/server';

// Stockage Cloud centralisé en mémoire Vercel Serverless / Cloud Sync Registry
const globalCloudRegistry: Record<string, any> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userEmail, shopData, etabId, shopName } = body;

    const cleanEmail = (userEmail || '').trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json({ success: false, error: 'Email obligatoire.' }, { status: 400 });
    }

    if (!globalCloudRegistry[cleanEmail]) {
      globalCloudRegistry[cleanEmail] = {};
    }

    const targetId = etabId || shopData?.etablissement?.id || `etab-${Date.now()}`;
    globalCloudRegistry[cleanEmail][targetId] = {
      ...shopData,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Boutique synchronisée sur le serveur central Cloud !',
      etabId: targetId,
    });
  } catch (error: any) {
    console.error('Erreur API sync POST:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Erreur serveur.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ success: false, shops: [] });
    }

    const userShopsMap = globalCloudRegistry[cleanEmail] || {};
    const shopsList = Object.values(userShopsMap);

    return NextResponse.json({
      success: true,
      shops: shopsList,
    });
  } catch (error: any) {
    console.error('Erreur API sync GET:', error);
    return NextResponse.json({ success: false, shops: [] });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const etabId = searchParams.get('etabId');

    const cleanEmail = (email || '').trim().toLowerCase();
    if (cleanEmail && etabId && globalCloudRegistry[cleanEmail]) {
      delete globalCloudRegistry[cleanEmail][etabId];
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false });
  }
}
