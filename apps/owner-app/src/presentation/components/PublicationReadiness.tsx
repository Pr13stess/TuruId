import { useCallback } from "react";
import { useRepositories } from "../../application/RepositoriesProvider";
import type { Property } from "../../domain/models";
import { publicationReadiness } from "../../domain/publicationReadiness";
import { useLoad } from "../hooks";
import { useNav } from "../navigation";
import { Button, Card, Load, T, Title } from "./UI";

export function PublicationReadiness({ property }: { property: Property }) {
  const { profile, rooms, pricing, refresh } = useRepositories();
  const nav = useNav();
  const q = useLoad(useCallback(async () => {
    const [owner, list] = await Promise.all([profile.get(), rooms.list(property.id)]);
    const plans = await Promise.all(list.filter(room => room.is_active).map(room => pricing.list(room.id)));
    return { owner, list, hasPlan: plans.some(group => group.some(plan => plan.is_active)) };
  }, [profile, rooms, pricing, property.id]));
  const issues = q.data ? publicationReadiness(property, q.data.owner.verification_status, q.data.list, q.data.hasPlan) : [];
  return <Card>
    <Title>Status tampil di User</Title>
    <Load {...q} />
    {q.data && <>
      {issues.length ? issues.map(issue => <T key={issue}>{issue}</T>) : <T>Syarat verifikasi, status tayang, kamar, dan paket aktif sudah terpenuhi.</T>}
      <T muted>Hasil pencarian tetap mengikuti periode sewa, harga, lokasi, dan filter User. Video tidak wajib. Status akun atau pembatasan server juga dapat memengaruhi akses.</T>
      {["DRAFT", "INACTIVE"].includes(property.publication_status) && <>
        <Button title="Atur status tayang" secondary onPress={() => nav.navigate("PropertyForm", { property })} />
        <T muted>Menyimpan formulir saat ini mengajukan verifikasi kos ulang, termasuk saat hanya mengubah status tayang.</T>
      </>}
      <Button title="Periksa ulang" secondary disabled={q.loading} onPress={refresh} />
    </>}
  </Card>;
}
