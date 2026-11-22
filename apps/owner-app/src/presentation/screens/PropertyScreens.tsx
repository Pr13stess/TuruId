import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { Text, TextInput } from "../components/Typography";
import { radius } from "../theme";
import { useRepositories } from "../../application/RepositoriesProvider";
import { available, Property } from "../../domain/models";
import { Props, useNav } from "../navigation";
import { useLoad } from "../hooks";
import { Icon, IconName } from "../components/Icon";
import { PropertyEditor } from "../components/PropertyEditor";
import { PublicationReadiness } from "../components/PublicationReadiness";
import {
  Badge,
  Button,
  C,
  Card,
  date,
  Empty,
  Link,
  Load,
  money,
  Page,
  Photo,
  Row,
  T,
  TextLink,
  Title,
} from "../components/UI";

const publicationLabel = {
  DRAFT: "Draft",
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  SUSPENDED: "Ditangguhkan",
  ARCHIVED: "Diarsipkan",
};
const verificationLabel = {
  DRAFT: "Belum diajukan",
  PENDING: "Menunggu verifikasi",
  APPROVED: "Terverifikasi",
  REJECTED: "Perlu revisi",
};

export function PropertyCard({
  property,
  capacity,
}: {
  property: Property;
  capacity?: string;
}) {
  const nav = useNav();
  const [menu, setMenu] = useState(false);
  return (
    <Card style={{ padding: 12, gap: 0 }}>
      <Row style={{ alignItems: "center", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Kelola ${property.name}`}
          onPress={() => nav.navigate("Property", { id: property.id })}
          className="flex-1 flex-row gap-3 items-center"
        >
          <View className="w-24">
            <Photo path={property.photos[0]} height={100} radius={radius.control} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text className="text-header font-bold text-ink">{property.name}</Text>
            <Text className="text-label leading-muted text-muted">
              {capacity ??
                `${property.city} · ${publicationLabel[property.publication_status]}`}
            </Text>
            <Text className="mt-1 text-label font-semibold text-accent-strong">
              Kelola properti →
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Opsi ${property.name}`}
          accessibilityState={{ expanded: menu }}
          onPress={() => setMenu(!menu)}
          className="h-12 w-12 items-center justify-center rounded-pill bg-soft"
        >
          <Icon name="more" size={20} color={C.navy} />
        </Pressable>
      </Row>
      {menu && (
        <View className="mt-3 border-t border-line">
          <Link
            title="Lihat detail properti"
            onPress={() => nav.navigate("Property", { id: property.id })}
          />
          <Link
            title="Edit informasi"
            last
            onPress={() => nav.navigate("PropertyForm", { property })}
          />
        </View>
      )}
    </Card>
  );
}

function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <Row style={{ marginTop: 10, minHeight: 44 }}>
      <Text className="flex-1 text-section font-bold text-ink">{title}</Text>
      {action}
    </Row>
  );
}

export function HomeScreen() {
  const { properties, profile, support, mode } = useRepositories();
  const nav = useNav();
  const q = useLoad(
    useCallback(async () => {
      const [p, d] = await Promise.all([profile.get(), properties.dashboard()]);
      return { p, d };
    }, [properties, profile]),
  );
  const notices = useLoad(
    useCallback(() => support.notifications(), [support]),
  );
  const d = q.data?.d;
  return (
    <Page
      title="Turu.Id"
      brand
      tab="Home"
      back={false}
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifikasi"
          onPress={() => nav.navigate("Notifications")}
          className="h-12 w-12 rounded-pill bg-accent-soft items-center justify-center"
        >
          <Icon name="bell" color={C.orangeDark} size={22} />
          {notices.data?.some((n) => !n.read_at) && (
            <View className="absolute top-2 right-2 h-2 w-2 rounded-pill bg-accent" />
          )}
        </Pressable>
      }
    >
      <View style={{ gap: 3 }}>
        <Text className="text-body text-muted">Selamat datang,</Text>
        <Text className="text-title font-extrabold text-ink">
          {q.data?.p.full_name ?? "Pemilik kos"}
        </Text>
      </View>
      <Load {...q} />
      {d && q.data && (
        <>
          <View style={{ gap: 8 }}>
            <Row style={{ gap: 8, alignItems: "stretch" }}>
              <Metric
                title="Total properti"
                value={String(d.properties.length)}
                icon="home"
                onPress={() => nav.navigate("Properties")}
              />
              <Metric
                title="Kamar tersedia"
                value={String(
                  d.rooms
                    .filter((r) => r.is_active)
                    .reduce((n, r) => n + available(r.inventory), 0),
                )}
                icon="key"
                onPress={() => nav.navigate("Properties")}
              />
            </Row>
            <Row style={{ gap: 8, alignItems: "stretch" }}>
              <Metric
                title="Pemesanan baru"
                value={String(
                  d.bookings.filter((b) => b.status === "CONFIRMED").length,
                )}
                icon="bookings"
                onPress={() => nav.navigate("Bookings")}
              />
              <Metric
                title={mode === "demo" ? "Pendapatan demo" : "Pendapatan sewa"}
                value={money(d.finance.rent_received)}
                icon="wallet"
                onPress={() => nav.navigate("Finance")}
              />
            </Row>
          </View>
          {q.data.p.verification_status !== "APPROVED" && (
            <Card style={{ backgroundColor: C.peach }}>
              <Badge>{verificationLabel[q.data.p.verification_status]}</Badge>
              <T>Selesaikan verifikasi owner untuk mulai menayangkan kos.</T>
              <Button
                title="Lengkapi data owner"
                onPress={() => nav.navigate("Onboarding")}
              />
            </Card>
          )}
          <View style={{ gap: 12 }}>
            <SectionHeading
              title="Properti Saya"
              action={
                <TextLink
                  title="Lihat semua"
                  onPress={() => nav.navigate("Properties")}
                />
              }
            />
            {d.properties.length ? (
              d.properties.slice(0, 2).map((p) => {
                const rooms = d.rooms.filter((r) => r.property_id === p.id);
                return (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    capacity={`${rooms.filter((r) => r.is_active).reduce((n, r) => n + available(r.inventory), 0)} dari ${rooms.reduce((n, r) => n + r.inventory.total, 0)} kamar tersedia`}
                  />
                );
              })
            ) : (
              <Empty
                title="Belum ada properti"
                body="Tambahkan kos pertama Anda dan mulai kelola kamar dalam satu tempat."
                action={
                  <Button
                    title="Tambahkan kos"
                    onPress={() => nav.navigate("PropertyForm", {})}
                  />
                }
              />
            )}
          </View>
          <View style={{ gap: 10, marginTop: 8 }}>
            <SectionHeading
              title="Aktivitas Terbaru"
              action={
                <TextLink
                  title="Lihat semua"
                  onPress={() => nav.navigate("Activities")}
                />
              }
            />
            {d.activities.length ? (
              d.activities
                .slice(0, 2)
                .map((a) => <ActivityCard key={a.id} activity={a} />)
            ) : (
              <Card>
                <T muted>Aktivitas akan muncul setelah ada pembaruan.</T>
              </Card>
            )}
          </View>
        </>
      )}
    </Page>
  );
}

export function Metric({
  title,
  value,
  icon,
  onPress,
}: {
  title: string;
  value: string;
  icon: IconName;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${title}: ${value}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.75 : 1 })}
    >
      <View className="flex-1 min-h-32 rounded-card border border-line bg-surface p-4 gap-3">
        <View className="h-10 w-10 rounded-control bg-accent-soft items-center justify-center">
          <Icon name={icon} size={22} color={C.orangeDark} />
        </View>
        <View className="gap-1">
          <Text className="text-label text-muted">{title}</Text>
          <Text className={value.length > 9 ? "text-body font-extrabold text-accent-strong" : "text-title font-extrabold text-accent-strong"}>{value}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ActivityCard({
  activity,
}: {
  activity: { title: string; body: string; created_at: string };
}) {
  return (
    <Card style={{ padding: 16, gap: 8 }}>
      <Text className="text-body font-bold text-ink">{activity.title}</Text>
      <Text className="text-label leading-muted text-muted">{activity.body}</Text>
      <Text className="text-caption text-muted">{date(activity.created_at)}</Text>
    </Card>
  );
}

export function ActivitiesScreen() {
  const { properties } = useRepositories();
  const q = useLoad(useCallback(() => properties.dashboard(), [properties]));
  return (
    <Page title="Aktivitas terbaru">
      <Load {...q} />
      {q.data?.activities.map((a) => (
        <ActivityCard key={a.id} activity={a} />
      ))}
      {q.data?.activities.length === 0 && (
        <Empty
          title="Belum ada aktivitas"
          body="Pembaruan kos dan pemesanan akan ditampilkan di sini."
        />
      )}
    </Page>
  );
}

export function PropertiesScreen() {
  const { properties } = useRepositories();
  const nav = useNav();
  const [search, setSearch] = useState("");
  const q = useLoad(useCallback(() => properties.dashboard(), [properties]));
  const list = q.data?.properties.filter((p) =>
    `${p.name} ${p.city}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <Page title="Properti saya">
      <View className="flex-row items-center gap-3 rounded-control border border-line bg-surface px-4">
        <Icon name="home" size={19} color={C.muted} />
        <TextInput
          accessibilityLabel="Cari properti"
          placeholder="Cari nama kos atau kota"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
          className="flex-1 min-h-12 py-3 text-body text-ink"
        />
      </View>
      <Button
        title="+ Tambahkan properti"
        onPress={() => nav.navigate("PropertyForm", {})}
      />
      <Load {...q} />
      {list?.map((p) => {
        const rooms = q.data!.rooms.filter((r) => r.property_id === p.id);
        return (
          <PropertyCard
            key={p.id}
            property={p}
            capacity={`${rooms.filter((r) => r.is_active).reduce((n, r) => n + available(r.inventory), 0)} dari ${rooms.reduce((n, r) => n + r.inventory.total, 0)} kamar tersedia`}
          />
        );
      })}
      {list?.length === 0 && (
        <Empty
          title={search ? "Properti tidak ditemukan" : "Belum ada properti"}
          body={
            search
              ? "Coba kata kunci nama kos atau kota yang lain."
              : "Mulai dengan menambahkan kos pertama Anda."
          }
        />
      )}
    </Page>
  );
}

export function PropertyScreen({ route }: Props<"Property">) {
  const { properties } = useRepositories();
  const nav = useNav();
  const [showBookings, setShowBookings] = useState(false);
  const q = useLoad(
    useCallback(async () => {
      const [dashboard, list] = await Promise.all([properties.dashboard(), properties.list()]);
      return { ...dashboard, properties: list };
    }, [properties]),
    0,
    true,
  );
  const p = q.data?.properties.find(
    (property) => property.id === route.params.id,
  );
  const rooms =
    q.data?.rooms.filter((room) => room.property_id === p?.id) ?? [];
  const bookings =
    q.data?.bookings.filter((booking) => booking.property_id === p?.id) ?? [];
  const reviews =
    q.data?.reviews.filter((review) => review.property_id === p?.id) ?? [];
  return (
    <Page title="Kelola properti" header={false} fullBleed>
      <View style={{ height: p ? 240 : 70 }}>
        {p && <Photo path={p.photos[0]} height={240} radius={0} />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() =>
            nav.canGoBack() ? nav.goBack() : nav.navigate("Home")
          }
          className="absolute top-4 left-5 h-12 w-12 items-center justify-center rounded-pill bg-surface shadow-card"
        >
          <Icon name="back" color={C.navy} size={20} />
        </Pressable>
      </View>
      <View
        style={{
          backgroundColor: C.white,
          borderTopLeftRadius: radius.card,
          borderTopRightRadius: radius.card,
          marginTop: p ? -24 : 0,
          padding: 20,
          gap: 20,
        }}
      >
        <Load {...q} loading={q.loading && !q.data} />
        {p && (
          <>
            <View style={{ gap: 7 }}>
              <Title>{p.name}</Title>
              <T muted style={{ fontSize: 12, lineHeight: 18 }}>
                {p.address}, {p.city}, {p.province}
              </T>
              <Row style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
                <Badge
                  tone={
                    p.verification_status === "APPROVED" ? "green" : "orange"
                  }
                >
                  {verificationLabel[p.verification_status]}
                </Badge>
                <Badge>{publicationLabel[p.publication_status]}</Badge>
              </Row>
            </View>
            <PropertyEditor
              key={p.id}
              property={p}
              rooms={rooms}
              reviews={reviews}
            />
            <PublicationReadiness property={p} />
            <Button
              title={showBookings ? "Tutup pemesanan kos" : "Pemesanan kos"}
              secondary
              onPress={() => setShowBookings(!showBookings)}
            />
            {showBookings && (
              <View style={{ gap: 15 }}>
                {bookings.map((booking) => (
                  <Pressable
                    key={booking.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Pemesanan ${booking.tenant}`}
                    onPress={() => nav.navigate("Booking", { id: booking.id })}
                  >
                    <Card>
                      <Row>
                        <T style={{ fontWeight: "700", flex: 1 }}>
                          {booking.tenant}
                        </T>
                        <Badge>{booking.status}</Badge>
                      </Row>
                      <T muted style={{ fontSize: 12 }}>
                        {booking.booking_code} ·{" "}
                        {booking.room_type_name_snapshot}
                      </T>
                    </Card>
                  </Pressable>
                ))}
                {!bookings.length && (
                  <Empty
                    title="Belum ada pemesanan"
                    body="Pemesanan untuk kos ini akan ditampilkan di sini."
                  />
                )}
                <TextLink
                  title="Buka semua pemesanan"
                  onPress={() => nav.navigate("Bookings")}
                />
              </View>
            )}
          </>
        )}
        {q.data && !p && (
          <Empty
            title="Kos tidak ditemukan"
            body="Properti mungkin sudah tidak dapat diakses."
          />
        )}
      </View>
    </Page>
  );
}
