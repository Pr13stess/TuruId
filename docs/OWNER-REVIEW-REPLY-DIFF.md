# Diff file lama ? balas ulasan

File baru tercatat terpisah dalam commit fitur.

```diff
diff --git a/apps/owner-app/src/data/mock/Repositories.ts b/apps/owner-app/src/data/mock/Repositories.ts
index a6da37e..f73261b 100644
--- a/apps/owner-app/src/data/mock/Repositories.ts
+++ b/apps/owner-app/src/data/mock/Repositories.ts
@@ -1,4 +1,5 @@
 import * as M from "../../domain/models";
+import { reviewReplyText } from "../../domain/reviewReply";
 import { AuthRepository } from "../../domain/repositories/AuthRepository";
 import { ProfileRepository } from "../../domain/repositories/ProfileRepository";
 import { PropertyRepository } from "../../domain/repositories/PropertyRepository";
@@ -154,6 +155,20 @@ export class MockPropertyRepository implements PropertyRepository {
   async reviews(id: string) {
     return (await this.s.read()).reviews.filter((r) => r.property_id === id);
   }
+  async replyReview(id: string, text: string) {
+    const body = reviewReplyText(text);
+    await this.s.write((s) => {
+      const review = s.reviews.find(r => r.id === id);
+      if (!review || !s.properties.some(p => p.id === review.property_id))
+        throw new Error("Ulasan tidak tersedia untuk dibalas.");
+      if (review.owner_reply != null) {
+        if (review.owner_reply === body) return;
+        throw new Error("Ulasan ini sudah dibalas. Muat ulang untuk melihat balasan.");
+      }
+      review.owner_reply = body;
+      review.owner_reply_at = now();
+    });
+  }
 }
 export class MockRoomRepository implements RoomRepository {
   constructor(private s: MockStore) {}
diff --git a/apps/owner-app/src/data/supabase/Repositories.ts b/apps/owner-app/src/data/supabase/Repositories.ts
index 6888f98..7093590 100644
--- a/apps/owner-app/src/data/supabase/Repositories.ts
+++ b/apps/owner-app/src/data/supabase/Repositories.ts
@@ -1,4 +1,5 @@
 import { uploadChatImage, findImageMessage } from "./chatImageUpload";
+import { replyToReview } from "./reviewReply";
 import { syncChatReceipt } from "../../domain/chatReceipt";
 import { uploadProfileAvatar } from "./profileAvatar";
 import type { ChatImagePayload } from "../../domain/chatUpload";
@@ -181,6 +182,9 @@ export class SupabasePropertyRepository
       (r) => r.property_id === id,
     );
   }
+  replyReview(id: string, text: string) {
+    return replyToReview(this.client, id, text);
+  }
 }
 export class SupabaseRoomRepository
   extends Repository
diff --git a/apps/owner-app/src/domain/models.ts b/apps/owner-app/src/domain/models.ts
index a83b065..c2b6862 100644
--- a/apps/owner-app/src/domain/models.ts
+++ b/apps/owner-app/src/domain/models.ts
@@ -99,6 +99,8 @@ export interface Booking {
   events: { to_status: string; reason: string; created_at: string }[];
 }
 export interface Review {
+  owner_reply?: string | null;
+  owner_reply_at?: string | null;
   id: string;
   property_id: string;
   tenant: string;
diff --git a/apps/owner-app/src/domain/repositories/PropertyRepository.ts b/apps/owner-app/src/domain/repositories/PropertyRepository.ts
index c0bbafa..04d81a9 100644
--- a/apps/owner-app/src/domain/repositories/PropertyRepository.ts
+++ b/apps/owner-app/src/domain/repositories/PropertyRepository.ts
@@ -5,4 +5,5 @@ export interface PropertyRepository {
   save(input: PropertyInput): Promise<string>;
   submitVerification(id: string, evidence: string): Promise<void>;
   reviews(propertyId: string): Promise<Review[]>;
+  replyReview(reviewId: string, text: string): Promise<void>;
 }
diff --git a/apps/owner-app/src/presentation/components/PropertyEditor.tsx b/apps/owner-app/src/presentation/components/PropertyEditor.tsx
index 05cdadc..1780e1d 100644
--- a/apps/owner-app/src/presentation/components/PropertyEditor.tsx
+++ b/apps/owner-app/src/presentation/components/PropertyEditor.tsx
@@ -6,6 +6,7 @@ import { useAction } from "../hooks";
 import { chooseImage } from "../media";
 import { Icon } from "./Icon";
 import { RoomsInlinePanel } from "./RoomsInlinePanel";
+import { ReviewReplyForm } from "./ReviewReplyForm";
 import {
   Badge,
   Button,
@@ -386,6 +387,7 @@ export function PropertyEditor({
                 <T style={{ color: C.orangeDark }}>★ {review.rating}/5</T>
               </Row>
               <T>{review.review_text}</T>
+              <ReviewReplyForm key={review.id} review={review} />
               <T muted style={{ fontSize: 11 }}>
                 {date(review.created_at)}
               </T>
diff --git a/apps/user-app/src/data/supabase/publicReviews.ts b/apps/user-app/src/data/supabase/publicReviews.ts
index 692d325..af1dce4 100644
--- a/apps/user-app/src/data/supabase/publicReviews.ts
+++ b/apps/user-app/src/data/supabase/publicReviews.ts
@@ -2,14 +2,24 @@ import type { SupabaseClient } from '@supabase/supabase-js';
 import type { PublicReview } from '../../domain/propertyFeedback';
 export async function listPublicReviews(client: SupabaseClient, propertyId: string, page: number): Promise<PublicReview[]> {
   if (!Number.isSafeInteger(page) || page < 0) throw new Error('Halaman tidak valid.');
-  const { data, error } = await client.from('reviews').select('id,rating,review_text,created_at')
+  const query = (fields: string) => client.from('reviews').select(fields)
     .eq('property_id', propertyId).eq('moderation_status', 'APPROVED')
     .order('created_at', { ascending: false }).order('id', { ascending: false })
     .range(page * 20, page * 20 + 20);
+  const legacyFields = 'id,rating,review_text,created_at';
+  let result = await query(`${legacyFields},owner_reply,owner_reply_at`);
+  // Only an absent reply column permits legacy reads; never hide network/RLS failures.
+  if (result.error && ['42703', 'PGRST204'].includes(result.error.code)
+      && /owner_reply(?:_at)?/.test(result.error.message)) result = await query(legacyFields);
+  const { data, error } = result;
   if (error) throw new Error('Ulasan gagal dimuat. Coba lagi.');
-  return (data ?? []).map(row => {
+  return (data ?? []).map(value => {
+    const row = value as unknown as PublicReview;
     if (!Number.isInteger(row.rating) || row.rating < 1 || row.rating > 5 || !Number.isFinite(Date.parse(row.created_at)))
       throw new Error('Data ulasan tidak valid.');
+    if (row.owner_reply != null && (typeof row.owner_reply !== 'string' || !row.owner_reply.trim()
+      || [...row.owner_reply].length > 2000 || !row.owner_reply_at || !Number.isFinite(Date.parse(row.owner_reply_at))))
+      throw new Error('Data balasan ulasan tidak valid.');
     return row;
   });
 }
diff --git a/apps/user-app/src/domain/propertyFeedback.ts b/apps/user-app/src/domain/propertyFeedback.ts
index a8f0ec5..0f98759 100644
--- a/apps/user-app/src/domain/propertyFeedback.ts
+++ b/apps/user-app/src/domain/propertyFeedback.ts
@@ -1,5 +1,6 @@
 export interface PublicReview {
   id: string; rating: number; review_text: string | null; created_at: string;
+  owner_reply?: string | null; owner_reply_at?: string | null;
 }
 export function propertyShareText(property: { name: string; address: string; latitude: number | null; longitude: number | null }) {
   const { latitude: lat, longitude: lon } = property;
diff --git a/apps/user-app/src/presentation/components/PropertyReviewsPreview.tsx b/apps/user-app/src/presentation/components/PropertyReviewsPreview.tsx
index 9dfb39e..43d38b6 100644
--- a/apps/user-app/src/presentation/components/PropertyReviewsPreview.tsx
+++ b/apps/user-app/src/presentation/components/PropertyReviewsPreview.tsx
@@ -7,6 +7,7 @@ import { useResource } from '../hooks/useResource';
 import { colors } from '../theme';
 import { Status } from './Primitives';
 import { PropertyImage } from './PropertyImage';
+import { OwnerReviewReply } from './OwnerReviewReply';
 
 export function PropertyReviewsPreview({ propertyId, photos = [], onViewAll }: {
   propertyId: string; photos?: string[]; onViewAll: () => void;
@@ -52,6 +53,7 @@ export function PropertyReviewsPreview({ propertyId, photos = [], onViewAll }: {
             </View>
             <Text style={s.description} numberOfLines={3}>{item.review_text || 'Penyewa memberikan rating tanpa komentar.'}</Text>
             <Text style={s.muted}>Penyewa terverifikasi</Text>
+            <OwnerReviewReply text={item.owner_reply} preview />
           </View>
         </Pressable>} />}
   </View>;
diff --git a/apps/user-app/src/presentation/screens/profile/ReviewsScreen.tsx b/apps/user-app/src/presentation/screens/profile/ReviewsScreen.tsx
index b937351..3d14d1d 100644
--- a/apps/user-app/src/presentation/screens/profile/ReviewsScreen.tsx
+++ b/apps/user-app/src/presentation/screens/profile/ReviewsScreen.tsx
@@ -8,6 +8,7 @@ import { useRepositories } from '../../../providers/RepositoryProvider';
 import { useResource } from '../../hooks/useResource';
 import { Button, Status } from '../../components/Primitives';
 import { colors } from '../../theme';
+import { OwnerReviewReply } from '../../components/OwnerReviewReply';
 
 export function ReviewsScreen({ route }: ScreenProps<'Reviews'>) {
   const { properties, mode } = useRepositories();
@@ -29,6 +30,7 @@ export function ReviewsScreen({ route }: ScreenProps<'Reviews'>) {
           </Svg>)}
         </View>
         {!!item.review_text && <Text style={{ color: colors.ink, lineHeight: 22 }}>{item.review_text}</Text>}
+        <OwnerReviewReply text={item.owner_reply} />
         <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString('id-ID')}</Text>
       </View>}
       ListFooterComponent={!state.loading && !state.error && (page > 0 || !!state.data?.length) ? <View style={{ gap: 10 }}>
diff --git a/tests/property-feedback.test.mjs b/tests/property-feedback.test.mjs
index ec6a547..ba47dae 100644
--- a/tests/property-feedback.test.mjs
+++ b/tests/property-feedback.test.mjs
@@ -22,7 +22,7 @@ test('public reviews explicitly filter approval even for multi-role accounts, pa
       assert.equal(url.searchParams.get('order'), 'created_at.desc,id.desc');
       assert.equal(url.searchParams.get('offset'), '20');
       assert.equal(url.searchParams.get('limit'), '21');
-      assert.equal(url.searchParams.get('select'), 'id,rating,review_text,created_at');
+      assert.equal(url.searchParams.get('select'), 'id,rating,review_text,created_at,owner_reply,owner_reply_at');
       return Response.json(fail ? { message: 'denied' } : [{ id: 'r1', rating: 4, review_text: 'Nyaman', created_at: '2026-10-17T00:00:00Z' }], { status: fail ? 403 : 200 });
     } },
   });
```
