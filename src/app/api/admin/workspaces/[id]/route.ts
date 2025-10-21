import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

export async function PATCH(req: Request, { params }: any) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  const orgIdParam = url.searchParams.get('orgId') || undefined;

  const allowed: Record<string, any> = {};

  if (body.name !== undefined) {
    allowed.name = String(body.name).trim();
  }

  if (body.totalBeds !== undefined) {
    const tb = Number(body.totalBeds);
    allowed.totalBeds = Number.isFinite(tb) ? tb : 0;
  }
  if (body.occupiedBeds !== undefined) {
    const ob = Number(body.occupiedBeds);
    allowed.occupiedBeds = Number.isFinite(ob) ? ob : 0;
  }
  if (body.occupancy !== undefined) {
    const num = Number(body.occupancy);
    allowed.occupancy = Number.isFinite(num) ? num : 0;
  }

  if (allowed.totalBeds !== undefined && allowed.occupiedBeds !== undefined) {
    const tb = Number(allowed.totalBeds) || 0;
    const ob = Number(allowed.occupiedBeds) || 0;
    allowed.occupancy = tb > 0 ? ob / tb : 0;
  }

  if (body.region !== undefined) {
    if (body.region === null) {
      allowed.region = null;
    } else {
      const region = String(body.region).trim();
      allowed.region = region || null;
    }
  }

  try {
    let resolvedOrgId: string | undefined = orgIdParam;
    let targetRef: any = null;
    let targetSnap: DocumentSnapshot | null = null;

    const tryFetch = async (refPath: string) => {
      const ref = adminDb.doc(refPath);
      const snap = await ref.get();
      return { ref, snap } as const;
    };

    if (resolvedOrgId) {
      try {
        const attempt = await tryFetch(`organisations/${resolvedOrgId}/workspaces/${id}`);
        targetRef = attempt.ref;
        targetSnap = attempt.snap;
      } catch (orgScopedErr) {
        console.warn('Failed to load org-scoped workspace directly', orgScopedErr);
      }
    }

    if (!targetSnap || !targetSnap.exists) {
      try {
        const attempt = await tryFetch(`workspaces/${id}`);
        targetRef = attempt.ref;
        targetSnap = attempt.snap;
      } catch (topLevelErr) {
        console.warn('Failed to load top-level workspace directly', topLevelErr);
      }
    }

    if (!targetSnap || !targetSnap.exists) {
      try {
        const cg = await adminDb
          .collectionGroup('workspaces')
          .where(admin.firestore.FieldPath.documentId(), '==', id)
          .limit(1)
          .get();
        if (!cg.empty) {
          const docSnap = cg.docs[0];
          targetRef = adminDb.doc(docSnap.ref.path);
          targetSnap = await targetRef.get();
          const parent = docSnap.ref.parent?.parent;
          if (parent?.id) {
            resolvedOrgId = parent.id;
          }
        }
      } catch (cgErr) {
        console.warn('collectionGroup search failed', cgErr);
      }
    }

    if (!targetSnap || !targetSnap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const existingData = targetSnap.data() || {};
    if (!resolvedOrgId && typeof existingData.organisationId === 'string') {
      resolvedOrgId = existingData.organisationId;
    }
    if (!resolvedOrgId) {
      const pathSegments = targetRef.path.split('/');
      const orgIndex = pathSegments.indexOf('organisations');
      if (orgIndex !== -1 && pathSegments[orgIndex + 1]) {
        resolvedOrgId = pathSegments[orgIndex + 1];
      }
    }

    const hasGroupKey = Object.prototype.hasOwnProperty.call(body, 'workspaceGroupId') || Object.prototype.hasOwnProperty.call(body, 'groupId');
    const existingGroupId: string | null = existingData.workspaceGroupId || existingData.groupId || null;
    let newGroupId: string | null | undefined = undefined;
    let newGroupPayload: { id: string; name: string; color: string | null } | null = existingData.workspaceGroup || null;

    if (hasGroupKey) {
      const rawGroupId = body.workspaceGroupId !== undefined ? body.workspaceGroupId : body.groupId;
      if (rawGroupId === null || rawGroupId === undefined || rawGroupId === '') {
        newGroupId = null;
      } else {
        const trimmed = String(rawGroupId).trim();
        newGroupId = trimmed || null;
      }

      if (newGroupId) {
        if (!resolvedOrgId) {
          return NextResponse.json({ error: 'organisationId is required to assign a workspace group' }, { status: 400 });
        }
        try {
          let groupRef = adminDb.doc(`organisations/${resolvedOrgId}/workspace-groups/${newGroupId}`);
          let groupSnap = await groupRef.get();

          if (!groupSnap.exists) {
            try {
              const cg = await adminDb
                .collectionGroup('workspace-groups')
                .where(admin.firestore.FieldPath.documentId(), '==', newGroupId)
                .limit(1)
                .get();
              if (!cg.empty) {
                const docSnap = cg.docs[0];
                groupRef = adminDb.doc(docSnap.ref.path);
                groupSnap = await groupRef.get();
                const parent = docSnap.ref.parent?.parent;
                if (parent?.id && resolvedOrgId !== parent.id) {
                  resolvedOrgId = parent.id;
                }
              }
            } catch (cgErr) {
              console.warn('collectionGroup lookup for workspace group failed', cgErr);
            }
          }

          if (!groupSnap.exists) {
            return NextResponse.json({ error: 'Workspace group not found' }, { status: 404 });
          }
          const groupData = groupSnap.data() || {};
          newGroupPayload = {
            id: groupRef.id,
            name: typeof groupData.name === 'string' ? groupData.name : groupRef.id,
            color: typeof groupData.color === 'string' ? groupData.color : null,
          };
          allowed.workspaceGroupId = newGroupPayload.id;
          allowed.workspaceGroup = newGroupPayload;
          allowed.workspaceGroupColor = newGroupPayload.color || null;
          if (allowed.region === undefined) {
            allowed.region = newGroupPayload.name;
          }
        } catch (groupErr) {
          console.error('Failed to resolve workspace group', groupErr);
          return NextResponse.json({ error: 'Failed to assign workspace group' }, { status: 500 });
        }
      } else {
        newGroupPayload = null;
        allowed.workspaceGroupId = null;
        allowed.workspaceGroup = null;
        allowed.workspaceGroupColor = null;
        if (allowed.region === undefined) {
          allowed.region = null;
        }
      }
    }

    allowed.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await targetRef.set(allowed, { merge: true });

    if (hasGroupKey && resolvedOrgId) {
      const membershipUpdates: Promise<any>[] = [];
      if (existingGroupId && existingGroupId !== (newGroupPayload?.id || null)) {
        const prevRef = adminDb.doc(`organisations/${resolvedOrgId}/workspace-groups/${existingGroupId}`);
        membershipUpdates.push(
          prevRef.set(
            {
              workspaceIds: admin.firestore.FieldValue.arrayRemove(id),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
        );
      }
      if (newGroupPayload && existingGroupId !== newGroupPayload.id) {
        const nextRef = adminDb.doc(`organisations/${resolvedOrgId}/workspace-groups/${newGroupPayload.id}`);
        membershipUpdates.push(
          nextRef.set(
            {
              workspaceIds: admin.firestore.FieldValue.arrayUnion(id),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
        );
      }
      if (membershipUpdates.length) {
        await Promise.all(membershipUpdates.map((p) => p.catch((err) => console.warn('Failed to update workspace group membership', err))));
      }
    }

    const updatedSnap = await targetRef.get();
    return NextResponse.json({ id: updatedSnap.id, ...(updatedSnap.data() || {}), organisationId: resolvedOrgId });
  } catch (e) {
    console.error('Failed to update workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: any) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    // Try top-level workspace first
    let ref = adminDb.doc(`workspaces/${id}`);
    let snap = await ref.get();
    let orgId: string | undefined = undefined;
    if (!snap || !snap.exists) {
      // Search org-scoped workspaces via collectionGroup
      try {
        const cg = await adminDb.collectionGroup('workspaces').where(admin.firestore.FieldPath.documentId(), '==', id).limit(1).get();
        if (!cg.empty) {
          const docSnap = cg.docs[0];
          ref = adminDb.doc(docSnap.ref.path);
          snap = await ref.get();
          const parent = docSnap.ref.parent && docSnap.ref.parent.parent ? docSnap.ref.parent.parent : null;
          orgId = parent && parent.id ? parent.id : undefined;
        }
      } catch (cgErr) {
        console.warn('collectionGroup search failed', cgErr);
      }
    }
    if (!snap || !snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: snap.id, ...(snap.data() || {}), organisationId: orgId });
  } catch (e) {
    console.error('Failed to get workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: any) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
  try {
    // Attempt to find workspace doc either top-level or org-scoped
    let targetRef: any = adminDb.doc(`workspaces/${id}`);
    let targetSnap = await targetRef.get();
    let resolvedOrgId: string | undefined;
    if (!targetSnap || !targetSnap.exists) {
      try {
        const cg = await adminDb.collectionGroup('workspaces').where(admin.firestore.FieldPath.documentId(), '==', id).limit(1).get();
        if (!cg.empty) {
          const docSnap = cg.docs[0];
          targetRef = adminDb.doc(docSnap.ref.path);
          targetSnap = await targetRef.get();
          const parent = docSnap.ref.parent?.parent;
          if (parent?.id) {
            resolvedOrgId = parent.id;
          }
        }
      } catch (cgErr) {
        console.warn('collectionGroup search failed', cgErr);
      }
    }
    if (!targetSnap || !targetSnap.exists) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const data = targetSnap.data() || {};
    if (!resolvedOrgId && typeof data.organisationId === 'string') {
      resolvedOrgId = data.organisationId;
    }
    if (!resolvedOrgId) {
      const pathParts = targetRef.path.split('/');
      const orgIndex = pathParts.indexOf('organisations');
      if (orgIndex !== -1 && pathParts[orgIndex + 1]) {
        resolvedOrgId = pathParts[orgIndex + 1];
      }
    }

    const existingGroupId: string | null = data.workspaceGroupId || data.groupId || null;
    if (resolvedOrgId && existingGroupId) {
      try {
        const groupRef = adminDb.doc(`organisations/${resolvedOrgId}/workspace-groups/${existingGroupId}`);
        await groupRef.set(
          {
            workspaceIds: admin.firestore.FieldValue.arrayRemove(id),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (membershipErr) {
        console.warn('Failed to remove workspace from group during delete', membershipErr);
      }
    }

    await targetRef.delete();
    return NextResponse.json({ success: true, message: 'Workspace deleted successfully' });
  } catch (e) {
    console.error('Failed to delete workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
