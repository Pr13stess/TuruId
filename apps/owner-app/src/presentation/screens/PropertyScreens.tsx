import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRepositories } from "../../application/RepositoriesProvider";
import { available, Property } from "../../domain/models";
import { Props, useNav } from "../navigation";
import { useLoad } from "../hooks";
import { Icon, IconName } from "../components/Icon";
import { PropertyEditor } from "../components/PropertyEditor";
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
    <Card style={{ padding: 12, gap: 0, borderRadius: 13 }}>
      <Row style={{ alignItems: "center", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Kelola ${property.name}`}
          onPress={() => nav.navigate("Property", { id: property.id })}
          style={{
            flex: 1,
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
          }}
        >
          <View style={{ width: 74 }}>
            <Photo path={property.photos[0]} height={78} radius={8} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T style={{ fontWeight: "800", fontSize: 14 }}>{property.name}</T>
            <T muted style={{ fontSize: 11, lineHeight: 16 }}>
              {capacity ??
                `${property.city} · ${publicationLabel[property.publication_status]}`}
            </T>
            <T
              style={{
                fontSize: 11,
                color: C.orangeDark,
                fontWeight: "600",
                marginTop: 4,
              }}
            >
              Kelola properti →
            </T>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Opsi ${property.name}`}
          accessibilityState={{ expanded: menu }}
          onPress={() => setMenu(!menu)}
          style={{
            width: 34,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="more" size={20} color={C.navy} />
        </Pressable>
      </Row>
      {menu && (
        <View style={{ borderTopWidth: 1, borderColor: C.line, marginTop: 12 }}>
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
      <T style={{ fontSize: 17, fontWeight: "800" }}>{title}</T>
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
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: C.orange,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Icon name="bell" color={C.white} size={22} />
          {notices.data?.some((n) => !n.read_at) && (
            <View
              style={{
                position: "absolute",
                top: 7,
                right: 8,
                width: 7,
                height: 7,
                borderRadius: 5,
                backgroundColor: C.white,
              }}
            />
          )}
        </Pressable>
      }
    >
      <View style={{ gap: 3 }}>
        <T style={{ fontSize: 15 }}>Selamat datang,</T>
        <T
          style={{
            fontSize: 24,
            lineHeight: 30,
            letterSpacing: -0.6,
            fontWeight: "800",
          }}
        >
          {q.data?.p.full_name ?? "Pemilik kos"}
        </T>
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
      <View style={s.metric}>
        <View style={s.metricIcon}>
          <Icon name={icon} size={22} color={C.white} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <T style={{ fontSize: 10, lineHeight: 14 }}>{title}</T>
          <T
            style={{
              color: C.orangeDark,
              fontSize: value.length > 9 ? 12 : 17,
              lineHeight: 21,
              fontWeight: "800",
            }}
          >
            {value}
          </T>
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
    <Card style={{ padding: 16, gap: 7, borderRadius: 13 }}>
      <T style={{ fontWeight: "700", fontSize: 13 }}>{activity.title}</T>
      <Row style={{ gap: 12 }}>
        <T muted style={{ fontSize: 11, flex: 1 }}>
          {activity.body}
        </T>
        <T muted style={{ fontSize: 10 }}>
          {date(activity.created_at)}
        </T>
      </Row>
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
      <Row
        style={{
          backgroundColor: C.soft,
          borderRadius: 13,
          paddingHorizontal: 14,
        }}
      >
        <Icon name="home" size={19} color={C.muted} />
        <TextInput
          accessibilityLabel="Cari properti"
          placeholder="Cari nama kos atau kota"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1, paddingVertical: 15, fontSize: 13, color: C.navy }}
        />
      </Row>
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
    useCallback(() => properties.dashboard(), [properties]),
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
          style={{
            position: "absolute",
            top: 18,
            left: 20,
            width: 44,
            height: 44,
            backgroundColor: C.white,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="back" color={C.navy} size={20} />
        </Pressable>
      </View>
      <View
        style={{
          backgroundColor: C.white,
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
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

const s = StyleSheet.create({
  metric: {
    flex: 1,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
    backgroundColor: C.peach,
    borderRadius: 13,
  },
  metricIcon: {
    width: 32,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.orange,
    justifyContent: "center",
    alignItems: "center",
  },
});
